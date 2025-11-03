// client/src/components/AdminCallElder.jsx
import React, { useState, useEffect } from 'react';

export default function AdminCallElder({ onCallInitiated, onCallEnded, selectedPerson }) {
  // Default to Grandma Zhang (elder-001 = Ms Zhang)
  // NOTE: Always use elder-001 for actual API calls, but display name changes based on selectedPerson
  const elderId = 'elder-001';
  const [callType, setCallType] = useState('regular');
  const [message, setMessage] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);
  const [callStatus, setCallStatus] = useState(''); // call status

  // Person name mapping (display only)
  const personNameMap = {
    'ms-zhang': 'Grandma Zhang',
    'mrs-ma': 'MRS.Ma',
    'mr-li': 'MR.Li'
  };

  // Display name changes based on selectedPerson, but always calls elder-001
  const displayName = personNameMap[selectedPerson] || 'Grandma Zhang';
  const elderInfo = {
    id: 'elder-001',
    name: displayName,
    status: 'online'
  };

  // Poll call status
  useEffect(() => {
    if (!currentCall) return;

    const checkCallStatus = async () => {
      try {
        console.log('🔍 Checking call status, room:', currentCall.room_id);
        const response = await fetch(`/tele/api/calls/status/${currentCall.room_id}`);
        console.log('📡 Status response:', response.status, response.ok);
        if (response.ok) {
          const status = await response.json();
          console.log('📞 Call status:', status);
          
          if (status.status === 'declined') {
            console.log('❌ Call declined by elder');
            setCallStatus('Declined by elder');
            alert('Declined by elder');
            // reset and close LiveKit
            setCurrentCall(null);
            onCallEnded?.();
          } else if (status.status === 'timeout') {
            console.log('⏰ Call timeout');
            setCallStatus('Timeout');
            alert('Timeout: no answer');
            setCurrentCall(null);
            onCallEnded?.();
          } else if (status.status === 'cancelled') {
            console.log('🚫 Call cancelled');
            setCallStatus('Cancelled');
            setCurrentCall(null);
            onCallEnded?.();
          } else if (status.status === 'ended') {
            console.log('📞 Call ended');
            setCallStatus('Ended');
            // auto-close LiveKit
            setCurrentCall(null);
            onCallEnded?.();
          } else if (status.status === 'answered') {
            console.log('✅ Elder answered');
            setCallStatus('Answered');
          } else {
            setCallStatus('Waiting for answer...');
          }
        }
      } catch (error) {
        console.error('Failed to check call status:', error);
      }
    };

    // initial check
    checkCallStatus();
    // every 3s
    const interval = setInterval(checkCallStatus, 3000);
    return () => clearInterval(interval);
  }, [currentCall, onCallEnded]);

  const callTypes = [
    { value: 'regular', label: 'Greeting', color: 'bg-blue-500' },
    { value: 'checkup', label: 'Health check', color: 'bg-green-500' },
    { value: 'emergency', label: 'Emergency', color: 'bg-red-500' },
  ];

  // Call elder (always calls Grandma Zhang)
  const handleCallElder = async () => {
    setIsCalling(true);
    
    try {
      const response = await fetch('/tele/api/calls/admin/call-elder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: 'admin-001',
          elder_id: elderId, // Always Grandma Zhang
          call_type: callType,
          message: message || 'Hello, this is the caregiver. I would like to talk with you.',
        }),
      });

      if (!response.ok) {
        throw new Error('Call failed');
      }

      const result = await response.json();
      setCurrentCall(result);
      // open LiveKit UI
      onCallInitiated?.(result);
      
      console.log(`📞 Calling ${elderInfo.name}...`);
    } catch (error) {
      console.error('Call failed:', error);
      alert('Call failed, please retry');
    } finally {
      setIsCalling(false);
    }
  };

  // Cancel call
  const handleCancelCall = async () => {
    if (!currentCall) return;

    try {
      // cancel call first
      await fetch('/tele/api/calls/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: currentCall.room_id,
          admin_id: 'admin-001'
        }),
      });

      // then mark ended
      await fetch('/tele/api/calls/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: currentCall.room_id
        }),
      });

      console.log('📞 Call cancelled and ended');
    } catch (error) {
      console.error('Cancel call failed:', error);
    }

    setCurrentCall(null);
    onCallEnded?.();
  };

  return (
    <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg border border-blue-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-2xl">
          📞
        </div>
        <h2 className="text-3xl font-bold text-gray-800">Call Elder</h2>
      </div>
      
      {/* Elder Info (Fixed to Grandma Zhang) */}
      <div className="mb-6 p-4 bg-white rounded-xl border-2 border-blue-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            elderInfo.status === 'online' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className="text-lg font-semibold text-gray-800">
            Calling: {elderInfo.name} ({elderInfo.status === 'online' ? '🟢 online' : '🔴 offline'})
          </span>
        </div>
      </div>

      {/* Call Type Selection */}
      <div className="mb-6">
        <label className="block text-lg font-semibold text-gray-700 mb-3">
          📋 Call Type
        </label>
        <div className="grid grid-cols-3 gap-3">
          {callTypes.map(type => (
            <button
              key={type.value}
              onClick={() => setCallType(type.value)}
              className={`px-4 py-3 rounded-xl text-white font-semibold transition-all duration-200 transform hover:scale-105 shadow-md ${
                callType === type.value 
                  ? `${type.color} shadow-lg` 
                  : 'bg-gray-400 hover:bg-gray-500'
              }`}
              disabled={isCalling}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Message */}
      <div className="mb-8">
        <label className="block text-lg font-semibold text-gray-700 mb-3">
          💬 Message (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter a message to the elder..."
          className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24 resize-none text-lg bg-white shadow-sm transition-all duration-200"
          disabled={isCalling}
        />
      </div>

      {/* Call status */}
      {currentCall && callStatus && (
        <div className="mb-6 p-4 bg-white rounded-xl border-2 border-blue-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-lg font-semibold text-blue-700">
              📊 {callStatus}
            </span>
          </div>
        </div>
      )}

      {/* Call/Cancel buttons */}
      <div className="flex gap-4">
        {!currentCall ? (
          <button
            onClick={handleCallElder}
            disabled={isCalling}
            className={`px-8 py-4 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-lg ${
              isCalling
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-xl'
            }`}
          >
            {isCalling ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Calling...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>📞</span>
                <span>Call Elder</span>
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={handleCancelCall}
            className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <span>❌</span>
            <span>Cancel</span>
          </button>
        )}
      </div>

    </div>
  );
}