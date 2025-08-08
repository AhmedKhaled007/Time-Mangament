import React from 'react';
import UserProfile from './UserProfile';

const Header: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 lg:px-8 gap-4 sm:gap-0">
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 lg:mb-3">🚀 Dev Time Master</h1>
          <p className="text-sm sm:text-base lg:text-lg opacity-90 px-2 sm:px-0">Beat distractions, crush procrastination, prioritize like a pro</p>
        </div>
        <div className="flex-shrink-0">
          <UserProfile />
        </div>
      </div>
    </div>
  );
};

export default Header;