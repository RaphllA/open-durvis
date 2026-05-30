# GitHub Pages 发布目录

这个目录是静态站点产物，可以直接发布到 GitHub Pages。

## 本地预览

建议在项目根目录运行：

```powershell
python -m http.server 8080 -d site
```

然后打开：

```text
http://localhost:8080
```

不要直接双击 `index.html`，因为浏览器的本地文件限制可能导致 `fetch('data/manifest.json')` 失败。

## 更新站点

后续把新的 DCE JSON 放进：

```text
incoming/dce-json/
```

然后运行：

```powershell
.\scripts\update-site.ps1
```

脚本会自动：

1. 导入或更新 `archive/dce_messages.sqlite3`。
2. 只渲染缺失或样式不一致的截图。
3. 重新生成 `site/data/*.json`。
4. 复制截图到 `site/images/`。

## 发布到 GitHub Pages

把 `site/` 里的内容作为 Pages 源发布即可。推荐单独建一个仓库，只提交：

```text
site/index.html
site/assets/
site/data/
site/images/
```

不要提交原始 Discord Token，不要提交未脱敏的原始 DCE JSON。
