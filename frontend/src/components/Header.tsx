import React from 'react';
import UserProfile from './UserProfile';

const Header: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-8">
      <div className="flex justify-between items-center px-8">
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-bold mb-3">🚀 Dev Time Master</h1>
          <p className="text-lg opacity-90">Beat distractions, crush procrastination, prioritize like a pro</p>
        </div>
        <div className="flex-shrink-0">
          <UserProfile />
        </div>
      </div>
    </div>
  );
};

export default Header;