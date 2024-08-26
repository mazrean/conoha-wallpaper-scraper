import fs from "fs/promises";
import https from "https";
import { program } from "commander";
import { z } from "zod";
import * as cheerio from "cheerio";
import { Agent } from "undici";
import { createWriteStream } from "fs";
import path from "path";

program.option(
  "--size <1080x1920|1242x2688|2560x1440|1280x800>",
  "Size of wallpaper",
  "2560x1440"
);
program.option(
  "-d, --dest <destination directory>",
  "Destination directory",
  "dest"
);
program.option(
  "--ignore-file <ignore list>",
  "Ignore list file path(default: ignore.txt)"
);
program.option("--dry-run", "Dry run", false);
program.parse();

const Size = z
  .enum(["1080x1920", "1242x2688", "2560x1440", "1280x800"])
  .default("2560x1440");
const Option = z.object({
  size: Size,
  dest: z.string().default("dest"),
  ignoreFile: z.string().default("./ignore.txt"),
  dryRun: z.boolean().default(false),
});
type Option = z.infer<typeof Option>;

const result = Option.safeParse(program.opts());
if (!result.success) {
  console.error(result.error.format());
  process.exit(1);
}
const options = result.data;

type Wallpaper = {
  id: string;
  url: string;
};

const scrape = async (size: z.infer<typeof Size>) => {
  const $ = await cheerio.fromURL("https://conoha.mikumo.com/wallpaper/", {
    requestOptions: {
      method: "GET",
      dispatcher: new Agent({
        connect: {
          // 中間証明書が設定されておらずTLSでエラーが発生するため、
          // rejectUnauthorized: falseで証明書検証を無効化
          rejectUnauthorized: false,
        },
      }),
    },
  });

  const createID = (thumbnailURL: string) =>
    thumbnailURL
      .replace(/^(https:\/\/conoha\.mikumo\.com\/wp\-content\/uploads\/)/, "")
      .replace(/(\.jpg)$/, "")
      .replace("/thumbnail", "")
      .replace("-thumbnail", "")
      .replace(/(-thumb)$/, "")
      .replaceAll("/", "-");

  const wallpapers = $(".listWallpaper_item")
    .toArray()
    .map((wallpaper) => {
      const $wallpaper = $(wallpaper);

      const thumbnailUrl = $wallpaper.find("img").attr("src");
      if (!thumbnailUrl) return;
      const id = createID(thumbnailUrl);

      const wallpaperUrls = $wallpaper
        .find("a")
        .toArray()
        .map((a) => $(a).attr("href") ?? "")
        .filter(
          (href) =>
            href &&
            (href.includes(size) || href.includes(size.replace("x", "_")))
        );
      if (wallpaperUrls.length === 0) return;

      return {
        id,
        url: wallpaperUrls[0],
      };
    })
    .filter(
      (wallpaper) =>
        wallpaper && Object.values(wallpaper).some((value) => value !== null)
    ) as Wallpaper[];

  return wallpapers;
};

const loadDest = async (dest: string) => {
  try {
    const stat = await fs.stat(dest);
    if (!stat.isDirectory()) throw new Error("dist is not a directory");
  } catch {
    if (options.dryRun) {
      console.error(`Directory not found: ${dest}`);
    } else {
      console.info(`Create directory: ${dest}`);

      await fs.mkdir(dest, {
        recursive: true,
      });
    }

    return [];
  }

  return await fs.readdir(dest);
};

const loadIgnoreList = async (ignoreFile: string, wallpapers: Wallpaper[]) => {
  try {
    const stat = await fs.stat(ignoreFile);
    if (!stat.isFile()) throw new Error("ignore file is not a file");
  } catch {
    console.info(`Create ignore file: ${ignoreFile}`);

    if (!options.dryRun) {
      const contents = wallpapers
        .map((wallpaper) => `# ${wallpaper.id}\n`)
        .join("");
      await fs.writeFile(
        ignoreFile,
        "# ConoHa Wallpaper Scraper Ignore List\n" + contents,
        "utf-8"
      );
    }

    return [];
  }

  try {
    const ignoreList = await fs.readFile(ignoreFile, "utf-8");
    return ignoreList
      .split("\n")
      .filter((line) => line.trim() !== "")
      .filter((line) => !line.startsWith("#"));
  } catch {
    return [];
  }
};

const download = (uri: string, filename: string) => {
  return new Promise<void>((resolve, reject) => {
    const url = new URL(uri);
    return https
      .request(
        {
          ...url,
          hostname: url.host,
          path: url.pathname,
          rejectUnauthorized: false,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
          },
        },
        (res) => {
          res
            .pipe(createWriteStream(filename))
            .on("close", resolve)
            .on("error", reject);
        }
      )
      .end();
  });
};

const downloadNewWallpapers = async (
  wallpapers: Wallpaper[],
  ignoreList: string[],
  destFiles: string[],
  dest: string
) => {
  const distFileMap = new Map(destFiles.map((file) => [file, true]));

  const ignoreMap = new Map(ignoreList.map((file) => [file, true]));

  for (const wallpaper of wallpapers) {
    if (ignoreMap.has(wallpaper.id)) {
      continue;
    }

    const { id, url } = wallpaper;
    const filename = `${id}.jpg`;
    if (distFileMap.has(filename)) {
      continue;
    }

    console.log(`Download: ${filename}`);
    if (options.dryRun) continue;

    console.log(`Download: ${url}`);
    download(url, `${dest}/${filename}`);
  }
};

const wallpapers = await scrape(options.size);
const distFiles = await loadDest(options.dest);

downloadNewWallpapers(
  wallpapers,
  await loadIgnoreList(options.ignoreFile, wallpapers),
  distFiles,
  options.dest
);
