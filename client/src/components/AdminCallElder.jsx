// client/src/components/AdminCallElder.jsx
import React, { useState, useEffect } from 'react';

export default function AdminCallElder({ onCallInitiated, onCallEnded }) {
  const [elderId, setElderId] = useState('');
  const [callType, setCallType] = useState('regular');
  const [message, setMessage] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);
  const [callStatus, setCallStatus] = useState(''); // call status

  // Mock elder list - in production, this would come from an API
  const elderList = [
    { id: 'elder-001', name: 'Ms Zhang', status: 'online' },
    { id: 'elder-002', name: 'Mr Li', status: 'online' },
    { id: 'elder-003', name: 'Ms Wang', status: 'offline' },
  ];

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

  // Call elder
  const handleCallElder = async () => {
    if (!elderId) {
      alert('Please select an elder');
      return;
    }

    setIsCalling(true);
    
    try {
      const response = await fetch('/tele/api/calls/admin/call-elder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: 'admin-001',
          elder_id: elderId,
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
      
      console.log(`📞 Calling ${elderList.find(e => e.id === elderId)?.name || elderId}...`);
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

  const selectedElder = elderList.find(e => e.id === elderId);

  return (
    <div className="card">
      <h2 className="font-bold mb-4">Call Elder</h2>
      
      {/* Elder Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select elder</label>
        <select
          value={elderId}
          onChange={(e) => setElderId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
          disabled={isCalling}
        >
          <option value="">Please choose</option>
          {elderList.map(elder => (
            <option key={elder.id} value={elder.id}>
              {elder.name} ({elder.status === 'online' ? 'online' : 'offline'})
            </option>
          ))}
        </select>
      </div>

      {/* Call Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Call type</label>
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
        <label className="block text-sm font-medium mb-2">Message (optional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a note to the elder..."
          className="w-full p-2 border border-gray-300 rounded-md h-20"
          disabled={isCalling}
        />
      </div>

      {/* Call status */}
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

      {/* Call/Cancel buttons */}
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
            {isCalling ? 'Calling...' : '📞 Call elder'}
          </button>
        ) : (
          <button
            onClick={handleCancelCall}
            className="px-4 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600"
          >
            ❌ Cancel
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
              {selectedElder.name} - {selectedElder.status === 'online' ? 'online' : 'offline'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}