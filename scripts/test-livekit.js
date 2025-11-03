#!/usr/bin/env node
// test-livekit.js - 测试LiveKit连接和屏幕共享功能

const https = require('https');
const WebSocket = require('ws');

async function testLiveKitConnection() {
  console.log('🧪 开始测试LiveKit连接和屏幕共享功能...\n');

  try {
    // 1. 测试token生成
    console.log('1️⃣ 测试LiveKit token生成...');
    const tokenResponse = await fetch('http://127.0.0.1:8300/tele/livekit/token?room=demo&identity=care-1&role=caregiver');
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.token) {
      throw new Error('Token生成失败');
    }
    
    console.log('✅ Token生成成功');
    console.log(`   URL: ${tokenData.url}`);
    console.log(`   Room: ${tokenData.room}`);
    console.log(`   Identity: ${tokenData.identity}`);
    console.log(`   Role: ${tokenData.role}\n`);

    // 2. 测试WebSocket连接
    console.log('2️⃣ 测试LiveKit WebSocket连接...');
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(tokenData.url);
      
      ws.on('open', () => {
        console.log('✅ WebSocket连接成功');
        
        // 发送连接消息
        const connectMessage = {
          type: 'join',
          token: tokenData.token,
          room: tokenData.room,
          identity: tokenData.identity
        };
        
        ws.send(JSON.stringify(connectMessage));
        console.log('📤 发送连接消息');
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📥 收到消息:', message.type || 'unknown');
          
          if (message.type === 'room_update') {
            console.log('✅ 房间连接成功');
            console.log(`   参与者数量: ${message.participants?.length || 0}`);
            ws.close();
            resolve();
          }
        } catch (e) {
          console.log('📥 收到二进制数据:', data.length, 'bytes');
        }
      });
      
      ws.on('error', (error) => {
        console.log('❌ WebSocket连接失败:', error.message);
        reject(error);
      });
      
      ws.on('close', () => {
        console.log('🔌 WebSocket连接关闭');
      });
      
      // 5秒超时
      setTimeout(() => {
        ws.close();
        reject(new Error('连接超时'));
      }, 5000);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testLiveKitConnection()
  .then(() => {
    console.log('\n🎉 LiveKit连接测试完成！');
    console.log('\n📋 下一步测试建议：');
    console.log('1. 打开浏览器访问: http://localhost:5173/care.html');
    console.log('2. 点击 "Start Call" 按钮');
    console.log('3. 检查是否能看到摄像头画面');
    console.log('4. 点击屏幕共享按钮测试屏幕共享功能');
    console.log('5. 查看浏览器控制台的调试日志');
  })
  .catch((error) => {
    console.error('\n💥 测试失败:', error.message);
    process.exit(1);
  });
