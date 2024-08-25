import * as cheerio from "cheerio";
import { Agent } from "undici";

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

const wallpapers = $(".listWallpaper_item")
  .toArray()
  .map((wallpaper) => {
    const wallpapers = $(wallpaper).find("a").toArray();

    const wallpaperObject: {
      smartPhone1080x1920: string | null;
      smartPhone1242x2688: string | null;
      pc2560x1440: string | null;
      pc1280x800: string | null;
    } = {
      smartPhone1080x1920: null,
      smartPhone1242x2688: null,
      pc2560x1440: null,
      pc1280x800: null,
    };
    for (const wallpaperElement of wallpapers) {
      const $wallpaper = $(wallpaperElement);
      const href = $wallpaper.attr("href");
      if (!href) continue;

      if (href.includes("1080x1920")) {
        wallpaperObject.smartPhone1080x1920 = href;
      }
      if (href.includes("1242x2688")) {
        wallpaperObject.smartPhone1242x2688 = href;
      }
      if (href.includes("2560x1440")) {
        wallpaperObject.pc2560x1440 = href;
      }
      if (href.includes("1280x800")) {
        wallpaperObject.pc1280x800 = href;
      }
    }

    return wallpaperObject;
  })
  .filter((wallpaper) =>
    Object.values(wallpaper).some((value) => value !== null)
  );

console.log(wallpapers);
