"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const axios_1 = require("axios");
const ejs = require("ejs");
const tiny = process.argv[2];
const url = tiny === 'tiny'
    ? 'https://raw.githubusercontent.com/gfwlist/tinylist/master/tinylist.txt'
    : 'https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt';
function renderFile(filepath, options) {
    let res;
    ejs.renderFile(filepath, options, (err, str) => {
        if (err) {
            throw err;
        }
        res = str;
    });
    return res;
}
// tslint:disable:cognitive-complexity
function parseRule(rule) {
    const hostR = [];
    const urlR = [];
    const regR = [];
    if (rule[0] === '|' && rule[1] === '|') {
        rule = rule.slice(2);
        if (rule[rule.length - 1] === '/') {
            rule = rule.slice(0, -1);
        }
        if (rule[0] === '.') {
            hostR.push(`*${rule}`);
        }
        else {
            hostR.push(rule);
            hostR.push(`*.${rule}`);
        }
    }
    else if (rule[0] === '|') {
        urlR.push(rule.slice(1));
    }
    else if (rule[0] === '/') {
        regR.push(rule.slice(1).slice(0, -1));
    }
    else {
        if (rule[0] === '.') {
            rule = `*${rule}`;
        }
        if (rule.includes('/')) {
            urlR.push(rule);
        }
        else if (rule.includes('.')) {
            if (rule[rule.length - 1] === '/') {
                rule = rule.slice(0, -1);
            }
            hostR.push(rule);
            if (rule[0] !== '*') {
                hostR.push(`*.${rule}`);
            }
        }
        else {
            urlR.push(rule);
        }
    }
    return {
        hostR,
        urlR,
        regR
    };
}
async function gfw2pac() {
    let hostRules = [];
    let urlRules = [];
    let regRules = [];
    let whiteHostRules = [];
    let whiteUrlRules = [];
    let whiteRegRules = [];
    const { data } = await axios_1.default.get(url);
    // const data = fs.readFileSync(path.resolve(__dirname, '../gfwlist.txt'), 'utf-8')
    const lines = Buffer.from(data, 'base64').toString('utf8').split('\n');
    for (const rule of lines) {
        let hostR;
        let urlR;
        let regR;
        if (rule[0] === '@' && rule[1] === '@') {
            ({ hostR, urlR, regR } = parseRule(rule.slice(2)));
            whiteHostRules = [...whiteHostRules, ...hostR];
            whiteUrlRules = [...whiteUrlRules, ...urlR];
            whiteRegRules = [...whiteRegRules, ...regR];
        }
        else if (rule && !['[', '!'].includes(rule[0])) {
            ({ hostR, urlR, regR } = parseRule(rule));
            hostRules = [...hostRules, ...hostR];
            urlRules = [...urlRules, ...urlR];
            regRules = [...regRules, ...regR];
        }
    }
    const hostRulesMap = {};
    for (const rule of hostRules) {
        const suffix = rule.split('.').reverse()[0];
        const groupList = hostRulesMap[suffix] || [];
        groupList.push(rule);
        hostRulesMap[suffix] = groupList;
    }
    const entries = Object.entries(hostRulesMap);
    for (const [key, rules] of entries) {
        if (rules.length > 1000) {
            const letterMap = {};
            for (const rule of rules) {
                const letter = rule.split('.').reverse()[1][0];
                const list = letterMap[letter] || [];
                list.push(rule);
                letterMap[letter] = list;
            }
            hostRulesMap[key] = letterMap;
        }
    }
    const pac = renderFile(path.resolve(__dirname, '../proxy.pac.ejs'), {
        // hostRules,
        hostRulesMap,
        urlRules,
        regRules,
        whiteHostRules,
        whiteUrlRules,
        whiteRegRules
    });
    fs.writeFileSync(path.resolve(__dirname, '../proxy.pac'), pac);
    console.info('generate proxy.pc success.');
}
exports.gfw2pac = gfw2pac;
gfw2pac();
//# sourceMappingURL=index.js.map