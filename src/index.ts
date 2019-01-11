import * as path from 'path'
import * as fs from 'fs'
import axios from 'axios'
import * as ejs from 'ejs'

const tiny = process.argv[2]

const url = tiny === 'tiny'
  ? 'https://raw.githubusercontent.com/gfwlist/tinylist/master/tinylist.txt'
  : 'https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt'

function renderFile (filepath, options): string {

  let res

  ejs.renderFile(filepath, options, (err, str) => {

    if (err) {
      throw err
    }
    res = str
  })

  return res
}

// tslint:disable:cognitive-complexity
function parseRule (rule) {

  const hostR = []
  const urlR = []
  const regR = []

  if (rule[0] === '|' && rule[1] === '|') {

    rule = rule.slice(2)

    if (rule[rule.length - 1] === '/') {
      rule = rule.slice(0, -1)
    }

    if (rule[0] === '.') {
      hostR.push(`*${rule}`)
    } else {
      hostR.push(rule)
      hostR.push(`*.${rule}`)
    }

  } else if (rule[0] === '|') {

    urlR.push(rule.slice(1))

  } else if (rule[0] === '/') {

    regR.push(rule.slice(1).slice(0, -1))

  } else {

    if (rule[0] === '.') {
      rule = `*${rule}`
    }

    if (rule.includes('/')) {
      urlR.push(rule)
    } else if (rule.includes('.')) {

      if (rule[rule.length - 1] === '/') {
        rule = rule.slice(0, -1)
      }

      hostR.push(rule)

      if (rule[0] !== '*') {
        hostR.push(`*.${rule}`)
      }
    } else {
      urlR.push(rule)
    }
  }

  return {
    hostR,
    urlR,
    regR
  }
}

export async function gfw2pac (): Promise<void> {

  let hostRules: string[] = []
  let urlRules: string[] = []
  let regRules: string[] = []
  let whiteHostRules: string[] = []
  let whiteUrlRules: string[] = []
  let whiteRegRules: string[] = []

  const { data } = await axios.get(url)
  // const data = fs.readFileSync(path.resolve(__dirname, '../gfwlist.txt'), 'utf-8')
  const lines: string[] = Buffer.from(data, 'base64').toString('utf8').split('\n')

  for (const rule of lines) {
    let hostR
    let urlR
    let regR

    if (rule[0] === '@' && rule[1] === '@') {
      ({ hostR, urlR, regR } = parseRule(rule.slice(2)))
      whiteHostRules = [...whiteHostRules, ...hostR]
      whiteUrlRules = [...whiteUrlRules, ...urlR]
      whiteRegRules = [...whiteRegRules, ...regR]
    } else if (rule && !['[', '!'].includes(rule[0])) {
      ({hostR, urlR, regR} = parseRule(rule))

      hostRules = [...hostRules, ...hostR]
      urlRules = [...urlRules, ...urlR]
      regRules = [...regRules, ...regR]
    }
  }

  const hostRulesMap: any = {}

  for (const rule of hostRules) {

    const suffix = rule.split('.').reverse()[0]
    const groupList = hostRulesMap[suffix] || []
    groupList.push(rule)

    hostRulesMap[suffix] = groupList
  }

  const entries: any = Object.entries(hostRulesMap)
  for (const [key, rules] of entries) {

    if (rules.length > 1000) {

      const letterMap = {}

      for (const rule of rules) {
        const letter = rule.split('.').reverse()[1][0]
        const list = letterMap[letter] || []
        list.push(rule)
        letterMap[letter] = list
      }

      hostRulesMap[key] = letterMap
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
  })

  fs.writeFileSync(path.resolve(__dirname, '../proxy.pac'), pac)

  console.info('generate proxy.pc success.')
}

gfw2pac()
