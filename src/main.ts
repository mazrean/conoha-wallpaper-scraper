import fs from 'fs/promises'
import https from 'https'
import { program } from 'commander'
import { z } from 'zod'
import * as cheerio from 'cheerio'
import { createWriteStream } from 'fs'
import path from 'path'
import type { IncomingMessage } from 'http'

const baseURL = 'https://conoha.mikumo.com'
const wallpaperPath = '/special/wallpaper/'
const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'

program.option(
  '--size <1080x1920|1242x2688|1280x800|2560x1440|1080x2400|1290x2796|2560x1600>',
  'Size of wallpaper',
  '2560x1440'
)
program.option(
  '-d, --dest <destination directory>',
  'Destination directory',
  'dest'
)
program.option(
  '--ignore-file <ignore list>',
  'Ignore list file path(default: ignore.txt)'
)
program.option('--dry-run', 'Dry run', false)
program.parse()

const Size = z
  .enum([
    '1080x1920',
    '1242x2688',
    '1280x800',
    '2560x1440',
    '1080x2400',
    '1290x2796',
    '2560x1600'
  ])
  .default('2560x1440')
type Size = z.infer<typeof Size>

const Option = z.object({
  size: Size,
  dest: z.string().default('dest'),
  ignoreFile: z.string().default('./ignore.txt'),
  dryRun: z.boolean().default(false)
})
type Option = z.infer<typeof Option>

const result = Option.safeParse(program.opts())
if (!result.success) {
  console.error(result.error.format())
  process.exit(1)
}
const options = result.data

type Wallpaper = {
  id: string
  url: string
}

// 壁紙一覧の各要素が持つdata-detailの中身(サイズ名 -> 画像情報)
// あんず一押し壁紙のようにwidth/heightを持たない要素もあるため、urlのみ必須とする
const WallpaperDetail = z.record(
  z.string(),
  z.object({
    url: z.string()
  })
)

const parseJSON = (value: string | undefined): unknown => {
  if (!value) return undefined

  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

const request = (uri: string) =>
  new Promise<IncomingMessage>((resolve, reject) => {
    https
      .get(
        uri,
        {
          // 以前、中間証明書が設定されておらずTLSでエラーが発生していたため、
          // 互換性のためrejectUnauthorized: falseで証明書検証を無効化している
          rejectUnauthorized: false,
          headers: {
            'User-Agent': userAgent
          }
        },
        res => {
          if (res.statusCode !== 200) {
            res.resume()
            reject(new Error(`Failed to fetch ${uri}: ${res.statusCode}`))
            return
          }

          resolve(res)
        }
      )
      .on('error', reject)
  })

const fetchText = async (uri: string) => {
  const res = await request(uri)

  const chunks: Uint8Array[] = []
  for await (const chunk of res) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf-8')
}

const scrape = async (size: Size) => {
  const html = await fetchText(new URL(wallpaperPath, baseURL).href)
  const $ = cheerio.load(html)

  // data-detailのキーは2560_1440のように区切りが_になっている
  const sizeKey = size.replace('x', '_')

  const createID = (thumbnailURL: string) =>
    decodeURIComponent(new URL(thumbnailURL, baseURL).pathname)
      .replace(/^\/(wp-content\/uploads|special\/wallpaper\/images)\//, '')
      .replace(/(\.jpg)$/, '')
      .replace('/thumbnail', '')
      .replace('-thumbnail', '')
      .replace(/(-thumb)$/, '')
      .replace(/\/サムネイル(_\d+×\d+)?/, '')
      .replaceAll('/', '-')

  return $('.js-wallpaper_listItem')
    .toArray()
    .flatMap<Wallpaper>(element => {
      const $wallpaper = $(element)

      const thumbnailURL = $wallpaper.attr('data-thumbnail')
      if (!thumbnailURL) return []
      const id = createID(thumbnailURL)

      const detail = WallpaperDetail.safeParse(
        parseJSON($wallpaper.attr('data-detail'))
      )
      if (!detail.success) {
        console.warn(`Skip ${id}: failed to parse wallpaper detail`)
        return []
      }

      const image = detail.data[sizeKey]
      if (!image) {
        console.warn(`Skip ${id}: ${size} is not available`)
        return []
      }

      return [
        {
          id,
          url: new URL(image.url, baseURL).href
        }
      ]
    })
}

const loadDest = async (dest: string) => {
  try {
    const stat = await fs.stat(dest)
    if (!stat.isDirectory()) throw new Error('dist is not a directory')
  } catch {
    if (options.dryRun) {
      console.error(`Directory not found: ${dest}`)
    } else {
      console.info(`Create directory: ${dest}`)

      await fs.mkdir(dest, {
        recursive: true
      })
    }

    return []
  }

  return await fs.readdir(dest)
}

const loadIgnoreList = async (ignoreFile: string, wallpapers: Wallpaper[]) => {
  try {
    const stat = await fs.stat(ignoreFile)
    if (!stat.isFile()) throw new Error('ignore file is not a file')
  } catch {
    console.info(`Create ignore file: ${ignoreFile}`)

    if (!options.dryRun) {
      const contents = wallpapers
        .map(wallpaper => `# ${wallpaper.id}\n`)
        .join('')
      await fs.writeFile(
        ignoreFile,
        '# ConoHa Wallpaper Scraper Ignore List\n' + contents,
        'utf-8'
      )
    }

    return []
  }

  try {
    const ignoreList = await fs.readFile(ignoreFile, 'utf-8')
    return ignoreList
      .split('\n')
      .filter(line => line.trim() !== '')
      .filter(line => !line.startsWith('#'))
  } catch {
    return []
  }
}

const download = async (uri: string, filename: string) => {
  const res = await request(uri)

  await new Promise<void>((resolve, reject) => {
    res
      .pipe(createWriteStream(filename))
      .on('close', resolve)
      .on('error', reject)
  })
}

const sleep = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time))

const downloadNewWallpapers = async (
  wallpapers: Wallpaper[],
  ignoreList: string[],
  destFiles: string[],
  dest: string
) => {
  const distFileMap = new Map(destFiles.map(file => [file, true]))

  const ignoreMap = new Map(ignoreList.map(file => [file, true]))

  for (const wallpaper of wallpapers) {
    if (ignoreMap.has(wallpaper.id)) {
      continue
    }

    const { id, url } = wallpaper
    const filename = `${id}.jpg`
    if (distFileMap.has(filename)) {
      continue
    }
    const filePath = path.join(dest, filename)

    console.log(`Download: ${id}(${url}) -> ${filePath}`)
    if (options.dryRun) continue

    try {
      await download(url, filePath)
    } catch (err) {
      // 1つの壁紙のダウンロードに失敗しても、残りのダウンロードは継続する
      console.error(`Failed to download ${id}: ${String(err)}`)
    }
    await sleep(500)
  }
}

const wallpapers = await scrape(options.size)
const distFiles = await loadDest(options.dest)

downloadNewWallpapers(
  wallpapers,
  await loadIgnoreList(options.ignoreFile, wallpapers),
  distFiles,
  options.dest
)
