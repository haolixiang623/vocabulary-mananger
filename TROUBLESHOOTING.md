# 故障排查指南

## 常见错误及解决方案

### 1. Supabase未加载错误

**错误信息：** `Supabase未加载，请确保在HTML中引入Supabase CDN脚本`

**解决方案：**
- 检查网络连接，确保可以访问CDN
- 检查浏览器控制台是否有网络错误
- 确认 `index.html` 中已正确引入Supabase CDN脚本

### 2. 模块导入错误

**错误信息：** `Failed to load module script` 或 `Cannot find module`

**解决方案：**
- 确保使用HTTP服务器运行项目（不能直接打开HTML文件）
- 检查文件路径是否正确
- 确保所有JS文件都在 `js/` 目录下

### 3. 数据库连接错误

**错误信息：** `Invalid API key` 或 `Row Level Security policy violation`

**解决方案：**
- 检查 `js/config.js` 中的Supabase URL和Key是否正确
- 确认已在Supabase Dashboard中执行了 `database/schema.sql` 脚本
- 检查RLS策略是否正确配置

### 4. 认证错误

**错误信息：** `Invalid login credentials` 或 `Email not confirmed`

**解决方案：**
- 确认邮箱已通过验证（检查邮箱收件箱）
- 确认密码正确
- 检查Supabase项目中的认证设置

### 5. CORS错误

**错误信息：** `CORS policy` 相关错误

**解决方案：**
- 在Supabase Dashboard中配置允许的域名
- 确保使用正确的Supabase项目URL

## 调试步骤

1. **打开浏览器开发者工具**（F12）
2. **查看Console标签**，检查是否有JavaScript错误
3. **查看Network标签**，检查API请求是否成功
4. **检查Application标签**，查看localStorage中是否有数据

## 测试清单

- [ ] Supabase CDN脚本已加载
- [ ] 配置文件中的URL和Key正确
- [ ] 数据库表已创建
- [ ] RLS策略已配置
- [ ] 邮箱认证功能已启用
- [ ] 网络连接正常

## 获取帮助

如果问题仍然存在，请提供以下信息：
1. 浏览器控制台的完整错误信息
2. Network标签中的失败请求详情
3. 使用的浏览器版本
4. 操作系统信息

