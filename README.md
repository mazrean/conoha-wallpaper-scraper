# ConoHa Wallpaper Scraper

[美雲このはの壁紙](https://conoha.mikumo.com/wallpaper/)を特定ディレクトリにダウンロードするスクリプトです。
各種OSの壁紙のスライドショー機能と組み合わせて、美雲このはのスライドショーを壁紙に設定できます。

## 動作環境

[Node.js](https://nodejs.org/)のみあれば動作します。
バージョンはv22.7.0で動作確認済みですが、最新のLTSバージョンであれば動作すると思われます。

## Quick Start

wgetが使える環境であれば、以下のワンライナーで実行ディレクトリ直下の`./dest`ディレクトリに壁紙をダウンロードできます。
```bash
wget -O - https://github.com/mazrean/conoha-wallpaper-scraper/releases/latest/download/main.mjs | node --input-type=module -
```
Windowsの場合はwgetの代わりに適宜ファイルをダウンロードし、Node.jsで実行してください。

ダウンロード先のディレクトリは`--dest`オプションで指定できます。
例) `./wallpapers`ディレクトリにダウンロードする場合
```bash
wget -O - https://github.com/mazrean/conoha-wallpaper-scraper/releases/latest/download/main.mjs | node --input-type=module - --dest ./wallpapers
```

その他、以下のようなオプションが利用できます。
```txt
Options:
  --size <1080x1920|1242x2688|2560x1440|1280x800>  Size of wallpaper (default: "2560x1440")
  -d, --dest <destination directory>               Destination directory (default: "dest")
  --ignore-file <ignore list>                      Ignore list file path(default: ignore.txt)
  --dry-run                                        Dry run (default: false)
  -h, --help                                       display help for command
```

## ダウンロードしない壁紙の指定

`--ignore-file`オプションでダウンロードしない壁紙のリストを指定できます。
リストは1行に1つの壁紙のidを記述することで、その壁紙をダウンロードしないようにできます。
実際の使用例は[ignore.txt](./example/ignore.txt)を参照してください。

## 開発者向け情報

自分でソースコードを変更し、ビルドなどを行いたい場合は[DEVELOPMENT.md](./DEVELOPMENT.md)を参照してください。
