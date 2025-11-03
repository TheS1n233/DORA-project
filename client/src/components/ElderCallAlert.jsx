// client/src/components/ElderCallAlert.jsx
import React, { useState, useEffect } from 'react';

export default function ElderCallAlert({ onCallAnswered, onCallDeclined }) {
  const [elderCalls, setElderCalls] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    // Poll for elder-initiated calls
    const pollElderCalls = async () => {
      try {
        console.log('🔍 ElderCallAlert: Polling for elder calls...');
        const response = await fetch('/tele/api/calls/admin/elder-calls');
        console.log('📡 ElderCallAlert: Response status:', response.status, response.ok);
        if (response.ok) {
          const calls = await response.json();
          console.log('📞 ElderCallAlert: All calls:', calls);
          // Filter for waiting calls only
          const waitingCalls = calls.filter(call => call.status === 'waiting');
          console.log('⏳ ElderCallAlert: Waiting calls:', waitingCalls);
          setElderCalls(waitingCalls);
          setIsVisible(waitingCalls.length > 0);
          setPulseAnimation(waitingCalls.length > 0);
          console.log('👁️ ElderCallAlert: Is visible:', waitingCalls.length > 0);
        }
      } catch (error) {
        console.error('❌ ElderCallAlert: Failed to fetch elder calls:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollElderCalls, 2000);
    pollElderCalls(); // Initial poll

    return () => clearInterval(interval);
  }, []);

  const handleAnswerCall = async (call) => {
    try {
      const response = await fetch('/tele/api/calls/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: call.room_id,
          user_id: 'admin-001',
          action: 'accept',
        }),
      });

      if (response.ok) {
        console.log('📞 Admin answered elder call:', call.room_id);
        onCallAnswered?.(call);
        // Remove from list
        setElderCalls(prev => prev.filter(c => c.room_id !== call.room_id));
        setIsVisible(elderCalls.length <= 1);
        setPulseAnimation(false);
      }
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  };

  const handleDeclineCall = async (call) => {
    try {
      const response = await fetch('/tele/api/calls/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: call.room_id,
          user_id: 'admin-001',
          action: 'decline',
        }),
      });

      if (response.ok) {
        console.log('❌ Admin declined elder call:', call.room_id);
        onCallDeclined?.(call);
        // Remove from list
        setElderCalls(prev => prev.filter(c => c.room_id !== call.room_id));
        setIsVisible(elderCalls.length <= 1);
        setPulseAnimation(false);
      }
    } catch (error) {
      console.error('Failed to decline call:', error);
    }
  };

  if (!isVisible || elderCalls.length === 0) {
    return null;
  }

  const currentCall = elderCalls[0]; // Show the most recent call

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-3xl shadow-2xl p-8 w-[95vw] max-w-[700px] text-center border-4 border-red-200">
        {/* Emergency Call Icon with Animation */}
        <div className={`w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl shadow-lg ${pulseAnimation ? 'animate-pulse' : ''}`}>
          <div className="animate-bounce">📞</div>
        </div>

        {/* Call Info */}
        <h2 className="text-4xl font-bold text-red-800 mb-4 animate-pulse">
          🚨 Emergency Call 🚨
        </h2>
        
        <div className="text-2xl text-red-700 mb-3 font-semibold">
          From: <span className="font-bold text-red-900">{currentCall.caller_id}</span>
        </div>

        {currentCall.message && (
          <div className="text-xl text-red-800 mb-8 p-6 bg-red-50 rounded-2xl border-2 border-red-200 shadow-inner">
            <div className="font-semibold mb-2">💬 Message:</div>
            <div className="italic">"{currentCall.message}"</div>
          </div>
        )}

        <div className="text-lg text-red-600 mb-8 p-4 bg-white rounded-xl shadow-sm border border-red-200">
          <div className="font-semibold">📋 Call Info</div>
          <div className="text-sm mt-2">Room ID: {currentCall.room_id}</div>
          <div className="text-sm">Time: {new Date(currentCall.created_at).toLocaleTimeString()}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-6 justify-center">
          <button
            onClick={() => handleAnswerCall(currentCall)}
            className="px-12 py-6 bg-gradient-to-r from-green-500 to-green-600 text-white text-2xl font-bold rounded-2xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-3"
          >
            <span className="text-3xl">✅</span>
            <span>Answer</span>
          </button>
          
          <button
            onClick={() => handleDeclineCall(currentCall)}
            className="px-12 py-6 bg-gradient-to-r from-red-500 to-red-600 text-white text-2xl font-bold rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-3"
          >
            <span className="text-3xl">❌</span>
            <span>Decline</span>
          </button>
        </div>

        {/* Auto-decline timer */}
        <div className="mt-6 text-lg text-red-600 font-semibold">
          ⏰ Auto-decline in 30s
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 text-red-300 text-6xl opacity-20">🚨</div>
        <div className="absolute bottom-4 left-4 text-red-300 text-4xl opacity-20">📞</div>
      </div>
    </div>
  );
}
