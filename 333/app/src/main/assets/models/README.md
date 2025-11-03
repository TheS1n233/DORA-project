# Vosk 离线语音识别模型

## 模型文件放置说明

请将 Vosk 英文小模型解压到此目录下，保持以下目录结构：

```
app/src/main/assets/models/vosk-model-small-en-us-0.15/
├── am/
├── conf/
├── graph/
├── ivector/
├── rescoring/
└── ...
```

## 下载链接

- **推荐（小体积）**：https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
- **更小（超轻量）**：https://alphacephei.com/vosk/models/vosk-model-small-en-us.zip

## 安装步骤

1. 下载模型 ZIP 文件（约 40MB）
2. 解压后，将整个 `vosk-model-small-en-us-0.15` 文件夹复制到 `app/src/main/assets/models/` 目录
3. 确保目录结构如上所示
4. 重新编译 APK，模型会自动打包进应用

## 注意事项

- 模型文件较大，会增加 APK 体积（约 40MB）
- 如需更小体积，可使用 `vosk-model-small-en-us`（约 40MB，但精度稍低）
- 中文模型：https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip（需要修改代码中的模型路径）




