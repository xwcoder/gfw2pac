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
export async function gfw2pac (): Promise<void> {

  const hostRules: string[] = []
  const urlRules: string[] = []
  const regRules: string[] = []

  const { data } = await axios.get(url)
  const lines: string[] = Buffer.from(data, 'base64').toString('utf8').split('\n')

  for (let rule of lines) {

    if (rule[0] === '|' && rule[1] === '|') {

      rule = rule.slice(2)

      if (rule[0] === '.') {
        hostRules.push(`*${rule}`)
      } else {
        hostRules.push(rule)
        hostRules.push(`*.${rule}`)
      }

    } else if (rule[0] === '|') {

      rule = rule.slice(1)
      urlRules.push(rule)

    } else if (rule[0] === '/') {

      regRules.push(rule.slice(1).slice(0, -1))

    } else if (rule && !['[', '!', '@'].includes(rule[0])) {

      if (rule[0] === '.') {
        rule = `*${rule}`
      }

      if (rule.includes('/')) {
        urlRules.push(rule)
      } else if (rule.includes('.')) {

        hostRules.push(rule)
        if (rule[0] !== '*') {
          hostRules.push(`*.${rule}`)
        }

      } else {
        urlRules.push(rule)
      }
    }
  }

  const pac = renderFile(path.resolve(__dirname, '../proxy.pac.ejs'), {hostRules, urlRules, regRules})

  fs.writeFileSync(path.resolve(__dirname, '../proxy.pac'), pac)

  console.info('generate proxy.pc success.')
}

gfw2pac()
