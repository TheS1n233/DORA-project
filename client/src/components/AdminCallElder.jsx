// client/src/components/AdminCallElder.jsx
import React, { useState, useEffect } from 'react';

export default function AdminCallElder({ onCallInitiated, onCallEnded }) {
  const [elderId, setElderId] = useState('');
  const [callType, setCallType] = useState('regular');
  const [message, setMessage] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);
  const [callStatus, setCallStatus] = useState(''); // 通话状态

  // Mock elder list - in production, this would come from an API
  const elderList = [
    { id: 'elder-001', name: '张奶奶', status: 'online' },
    { id: 'elder-002', name: '李爷爷', status: 'online' },
    { id: 'elder-003', name: '王奶奶', status: 'offline' },
  ];

  // 轮询检查通话状态
  useEffect(() => {
    if (!currentCall) return;

    const checkCallStatus = async () => {
      try {
        console.log('🔍 开始检查通话状态，房间ID:', currentCall.room_id);
        const response = await fetch(`http://127.0.0.1:8300/api/calls/status/${currentCall.room_id}`);
        console.log('📡 状态检查响应:', response.status, response.ok);
        if (response.ok) {
          const status = await response.json();
          console.log('📞 通话状态检查:', status);
          
          if (status.status === 'declined') {
            console.log('❌ 老人拒绝了通话');
            setCallStatus('老人拒绝了通话');
            alert('老人拒绝了通话');
            // 重置状态并关闭LiveKit界面
            setCurrentCall(null);
            onCallEnded?.();
          } else if (status.status === 'timeout') {
            console.log('⏰ 通话超时');
            setCallStatus('通话超时');
            alert('通话超时，老人未接听');
            setCurrentCall(null);
            onCallEnded?.();
          } else if (status.status === 'cancelled') {
            console.log('🚫 通话已取消');
            setCallStatus('通话已取消');
            setCurrentCall(null);
            onCallEnded?.();
          } else if (status.status === 'ended') {
            console.log('📞 通话已结束');
            setCallStatus('通话已结束');
            // 自动关闭LiveKit界面，不需要用户手动操作
            setCurrentCall(null);
            onCallEnded?.();
          } else if (status.status === 'answered') {
            console.log('✅ 老人已接听');
            setCallStatus('老人已接听');
          } else {
            setCallStatus('等待老人接听...');
          }
        }
      } catch (error) {
        console.error('检查通话状态失败:', error);
      }
    };

    // 立即检查一次
    checkCallStatus();
    
    // 每3秒检查一次
    const interval = setInterval(checkCallStatus, 3000);
    
    return () => clearInterval(interval);
  }, [currentCall, onCallEnded]);

  const callTypes = [
    { value: 'regular', label: '日常问候', color: 'bg-blue-500' },
    { value: 'checkup', label: '健康检查', color: 'bg-green-500' },
    { value: 'emergency', label: '紧急联系', color: 'bg-red-500' },
  ];

  // 呼叫老人
  const handleCallElder = async () => {
    if (!elderId) {
      alert('请选择要呼叫的老人');
      return;
    }

    setIsCalling(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8300/api/calls/admin/call-elder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: 'admin-001',
          elder_id: elderId,
          call_type: callType,
          message: message || '您好，我是管理员，想和您聊聊天',
        }),
      });

      if (!response.ok) {
        throw new Error('呼叫失败');
      }

      const result = await response.json();
      setCurrentCall(result);
      
      // 直接打开LiveKit界面
      onCallInitiated?.(result);
      
      console.log(`📞 正在呼叫 ${elderList.find(e => e.id === elderId)?.name || elderId}...`);
    } catch (error) {
      console.error('Call failed:', error);
      alert('呼叫失败，请重试');
    } finally {
      setIsCalling(false);
    }
  };

  // 取消呼叫
  const handleCancelCall = async () => {
    if (!currentCall) return;

    try {
      // 先取消呼叫
      await fetch('http://127.0.0.1:8300/api/calls/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: currentCall.room_id,
          admin_id: 'admin-001'
        }),
      });

      // 再通知通话结束
      await fetch('http://127.0.0.1:8300/api/calls/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: currentCall.room_id
        }),
      });

      console.log('📞 呼叫已取消并结束');
    } catch (error) {
      console.error('Cancel call failed:', error);
    }

    // 重置状态
    setCurrentCall(null);
    onCallEnded?.();
  };

  const selectedElder = elderList.find(e => e.id === elderId);

  return (
    <div className="card">
      <h2 className="font-bold mb-4">呼叫老人</h2>
      
      {/* Elder Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">选择老人</label>
        <select
          value={elderId}
          onChange={(e) => setElderId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
          disabled={isCalling}
        >
          <option value="">请选择老人</option>
          {elderList.map(elder => (
            <option key={elder.id} value={elder.id}>
              {elder.name} ({elder.status === 'online' ? '在线' : '离线'})
            </option>
          ))}
        </select>
      </div>

      {/* Call Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">呼叫类型</label>
        <div className="flex gap-2">
          {callTypes.map(type => (
            <button
              key={type.value}
              onClick={() => setCallType(type.value)}
              className={`px-3 py-1 rounded-md text-sm ${
                callType === type.value 
                  ? `${type.color} text-white` 
                  : 'bg-gray-200 text-gray-700'
              }`}
              disabled={isCalling}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Message */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">留言（可选）</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入给老人的留言..."
          className="w-full p-2 border border-gray-300 rounded-md h-20"
          disabled={isCalling}
        />
      </div>

      {/* 通话状态显示 */}
      {currentCall && callStatus && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-sm font-medium text-blue-700">
              {callStatus}
            </span>
          </div>
        </div>
      )}

      {/* 呼叫按钮 */}
      <div className="flex gap-2">
        {!currentCall ? (
          <button
            onClick={handleCallElder}
            disabled={!elderId || isCalling}
            className={`px-4 py-2 rounded-md font-medium ${
              !elderId || isCalling
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isCalling ? '呼叫中...' : '📞 呼叫老人'}
          </button>
        ) : (
          <button
            onClick={handleCancelCall}
            className="px-4 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600"
          >
            ❌ 取消呼叫
          </button>
        )}
      </div>

      {/* Elder Status Indicator */}
      {selectedElder && (
        <div className="mt-3 p-2 bg-gray-50 rounded-md">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              selectedElder.status === 'online' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {selectedElder.name} - {selectedElder.status === 'online' ? '在线' : '离线'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}