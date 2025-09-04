import React, { useState } from "react";

const VoiceAssistantIcon = () => {
  const [listening, setListening] = useState(false);

  const toggleListening = () => {
    setListening(!listening);
  };

  return (
    <div
      className="flex items-center cursor-pointer"
      onClick={toggleListening}
      title={listening ? "Listening..." : "Click to speak"}
    >
      {/* 外层容器 */}
      <div className="relative w-10 h-10 flex items-center justify-center">
        {/* 波纹动画 */}
        {listening && (
          <>
            <span className="absolute w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 opacity-70 animate-ping"></span>
            <span className="absolute w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 via-green-400 to-purple-400 opacity-60 animate-ping delay-200"></span>
          </>
        )}
        {/* 中心圆点 */}
        <div
          className={`w-6 h-6 rounded-full transition-colors duration-300 ${
            listening
              ? "bg-gradient-to-r from-blue-400 via-pink-400 to-purple-500"
              : "bg-gray-400"
          }`}
        ></div>
      </div>
      <span className="ml-2 font-bold text-lg text-green-600">DORA</span>
    </div>
  );
};

export default VoiceAssistantIcon;
  