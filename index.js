require('dotenv').config()
const request = require('request')
const _ = require('underscore')
const fs = require('fs')

async function getLatestData(currency) {
  const key = process.env.EXCHANGE_RATE_LAB_API_KEY
  const url = `http://api.exchangeratelab.com/api/history/week?apikey=${encodeURIComponent(key)}&curr=${currency}`
  return new Promise((resolve, reject) => {
    request(url, { json: true }, (err, res, body) => {
      if (err) { reject(err) }
      resolve(body)
    })
  })
}

function formatData(data) {
  return data.currencies.map((d) => {
    const base = {
      from: d.currencyFrom,
      to: d.currencyTo,
      amount: d.amountTo
    }
    const inverse = {
      from: base.to,
      to: base.from,
      amount: 1 / base.amount,
      calculated: true,
    }
    const rates = [base, inverse]
    return {
      date: d.dateCurrencyRate,
      rates
    }
  })
}

function mergedData(oldData, newData) {
  const out = [].concat(oldData)
  for (const newD of newData) {
    const existing = out.find((item) => item.date === newD.date)
    if (existing) {
      existing.rates = newD.rates
    } else {
      out.push(newD)
    }
  }
  return _.sortBy(out, (d) => new Date(d.date)).reverse()
}

async function getAndCacheData() {
  let data
  try {
    data = await getLatestData(process.env.CURRENCY)
  } catch (e) {
    console.error('Failed to get data...')
    console.error(e)
  }
  const newData = formatData(data)

  let currentData = []
  const path = process.env.DATA_PATH || './data.json'
  if (fs.existsSync(path)) {
    currentData = JSON.parse(fs.readFileSync(path))
  }

  const finalData = mergedData(currentData, newData).slice(0, process.env.LIMIT || 365)

  fs.writeFileSync(path, JSON.stringify(finalData))

  console.log("Updated data...")

}

getAndCacheData()
