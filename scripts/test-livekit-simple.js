#!/usr/bin/env node
// test-livekit-simple.js - 简单测试LiveKit服务

async function testLiveKitServices() {
  console.log('🧪 开始测试LiveKit相关服务...\n');

  try {
    // 1. 测试前端服务
    console.log('1️⃣ 测试前端服务...');
    const frontendResponse = await fetch('http://localhost:5173');
    if (frontendResponse.ok) {
      console.log('✅ 前端服务运行正常 (端口5173)');
    } else {
      throw new Error('前端服务响应异常');
    }

    // 2. 测试tele-assist服务
    console.log('\n2️⃣ 测试tele-assist服务...');
    const teleAssistResponse = await fetch('http://127.0.0.1:8300/health');
    if (teleAssistResponse.ok) {
      console.log('✅ tele-assist服务运行正常 (端口8300)');
    } else {
      console.log('⚠️ tele-assist健康检查失败，但服务可能仍在运行');
    }

    // 3. 测试LiveKit token生成
    console.log('\n3️⃣ 测试LiveKit token生成...');
    const tokenResponse = await fetch('http://127.0.0.1:8300/tele/livekit/token?room=demo&identity=care-1&role=caregiver');
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.token) {
      throw new Error('Token生成失败');
    }
    
    console.log('✅ LiveKit token生成成功');
    console.log(`   URL: ${tokenData.url}`);
    console.log(`   Room: ${tokenData.room}`);
    console.log(`   Identity: ${tokenData.identity}`);
    console.log(`   Role: ${tokenData.role}`);

    // 4. 测试会话日志服务
    console.log('\n4️⃣ 测试会话日志服务...');
    const loggerResponse = await fetch('http://127.0.0.1:8088/events');
    if (loggerResponse.ok) {
      console.log('✅ 会话日志服务运行正常 (端口8088)');
    } else {
      console.log('⚠️ 会话日志服务响应异常');
    }

    // 5. 测试健康监控服务
    console.log('\n5️⃣ 测试健康监控服务...');
    const healthResponse = await fetch('http://127.0.0.1:8089/docs');
    if (healthResponse.ok) {
      console.log('✅ 健康监控服务运行正常 (端口8089)');
    } else {
      console.log('⚠️ 健康监控服务响应异常');
    }

    console.log('\n🎉 所有服务测试完成！');
    console.log('\n📋 屏幕共享功能测试步骤：');
    console.log('1. 打开浏览器访问: http://localhost:5173/care.html');
    console.log('2. 点击 "Start Call" 或 "Join" 按钮');
    console.log('3. 等待LiveKit连接建立');
    console.log('4. 检查是否能看到摄像头画面（不再是灰色头像）');
    console.log('5. 点击屏幕共享按钮，选择要共享的屏幕');
    console.log('6. 检查是否能看到屏幕共享画面和屏幕共享图标');
    console.log('7. 查看浏览器控制台的调试日志');
    console.log('\n🔍 调试提示：');
    console.log('- 打开浏览器开发者工具 (F12)');
    console.log('- 查看Console标签页的日志');
    console.log('- 查找 "🖥️ Screen share track subscribed" 等消息');
    console.log('- 如果看到错误，请检查摄像头和屏幕共享权限');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.log('\n🔧 故障排除建议：');
    console.log('1. 检查Docker服务是否都在运行: docker ps');
    console.log('2. 检查前端服务: cd /workspaces/dora/client && npm run dev');
    console.log('3. 检查端口占用: netstat -tlnp | grep -E "(5173|8300|8088|8089)"');
    process.exit(1);
  }
}

// 运行测试
testLiveKitServices();
