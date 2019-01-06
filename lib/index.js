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
async function gfw2pac() {
    const hostRules = [];
    const urlRules = [];
    const regRules = [];
    const { data } = await axios_1.default.get(url);
    const lines = Buffer.from(data, 'base64').toString('utf8').split('\n');
    for (let rule of lines) {
        if (rule[0] === '|' && rule[1] === '|') {
            rule = rule.slice(2);
            if (rule[0] === '.') {
                hostRules.push(`*${rule}`);
            }
            else {
                hostRules.push(rule);
                hostRules.push(`*.${rule}`);
            }
        }
        else if (rule[0] === '|') {
            rule = rule.slice(1);
            urlRules.push(rule);
        }
        else if (rule[0] === '/') {
            regRules.push(rule.slice(1).slice(0, -1));
        }
        else if (rule && !['[', '!', '@'].includes(rule[0])) {
            if (rule[0] === '.') {
                rule = `*${rule}`;
            }
            if (rule.includes('/')) {
                urlRules.push(rule);
            }
            else if (rule.includes('.')) {
                hostRules.push(rule);
                if (rule[0] !== '*') {
                    hostRules.push(`*.${rule}`);
                }
            }
            else {
                urlRules.push(rule);
            }
        }
    }
    const pac = renderFile(path.resolve(__dirname, '../proxy.pac.ejs'), { hostRules, urlRules, regRules });
    fs.writeFileSync(path.resolve(__dirname, '../proxy.pac'), pac);
    console.info('generate proxy.pc success.');
}
exports.gfw2pac = gfw2pac;
gfw2pac();
//# sourceMappingURL=index.js.map