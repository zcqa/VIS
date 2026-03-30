# GitHub Pages 发布准备清单

## 一、推仓库前检查

- [ ] 当前项目目录使用的是精简后的提交版本
- [ ] `node_modules/` 没有被提交
- [ ] `dist/` 没有被提交
- [ ] `package-lock.json` 已保留
- [ ] `.github/workflows/deploy.yml` 已保留
- [ ] `HW2_PROJECT_WRITEUP.md` 已保留
- [ ] `public/.nojekyll` 已存在
- [ ] `npm run build` 本地通过

## 二、仓库结构检查

仓库根目录建议包含：

- [ ] `.github/`
- [ ] `data/`
- [ ] `public/`
- [ ] `scripts/`
- [ ] `src/`
- [ ] `package.json`
- [ ] `package-lock.json`
- [ ] `vite.config.ts`
- [ ] `README.md`
- [ ] `HW2_PROJECT_WRITEUP.md`
- [ ] `GITHUB_PAGES_CHECKLIST.md`

## 三、GitHub 仓库设置

- [ ] 已创建 GitHub 仓库
- [ ] 项目已推送到 `main` 分支
- [ ] 仓库 `Settings → Pages` 已打开
- [ ] Source 已设置为 `GitHub Actions`

## 四、工作流检查

- [ ] `Deploy to GitHub Pages` workflow 能看到
- [ ] push 到 `main` 后 workflow 自动触发
- [ ] 若未自动触发，已手动点击 `Run workflow`
- [ ] Actions 中 `build` 步骤通过
- [ ] Actions 中 `deploy` 步骤通过

## 五、发布后检查

- [ ] GitHub Pages URL 可以正常打开
- [ ] 首页可以正常加载图表
- [ ] `public/data/` 中的数据能正常读取
- [ ] 中英切换正常
- [ ] 左侧筛选栏正常
- [ ] 散点图、历史路径、能源视图都能交互
- [ ] 页面在桌面端显示正常
- [ ] 页面在窄屏下能回到单列布局

## 六、如果部署失败，优先检查

1. 是否把错误目录推到了仓库根目录  
   不是把 `webapp_submission` 文件夹本身当作一层额外目录推上去，而是应该把它里面的内容作为仓库根内容。

2. Pages Source 是否选成了 `GitHub Actions`

3. `package-lock.json` 是否缺失  
   workflow 使用 `npm ci`，没有 lock file 时容易失败。

4. 是否误删了 `data/raw/` 或 `public/data/`  
   当前构建流程依赖这些文件。

5. Actions 是否没有权限  
   检查仓库是否允许 GitHub Actions 发布 Pages。

## 七、最终提交建议

- 课程提交目录可直接使用：`D:\\VIS_hw\\webapp_submission`
- 若需要压缩包，可直接使用：`D:\\VIS_hw\\webapp_submission.zip`
