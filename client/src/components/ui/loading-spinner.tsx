import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text = 'Loading...' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16', 
    lg: 'w-24 h-24'
  };

  const centerSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Modern geometric loader */}
      <div className="relative">
        {/* Outer rotating ring - teal */}
        <div className={`${sizeClasses[size]} border-4 border-blue-100 border-t-teal-500 border-r-teal-400 rounded-full animate-spin`}></div>
        
        {/* Middle rotating ring - blue/green gradient effect */}
        <div className={`absolute inset-2 ${size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-8 h-8' : 'w-4 h-4'} border-3 border-green-100 border-l-blue-500 border-b-green-500 rounded-full animate-spin-reverse`}></div>
        
        {/* Inner animated dots pattern */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Central pulsing dot */}
            <div className={`${centerSizeClasses[size]} bg-gradient-to-r from-teal-500 to-blue-500 rounded-full animate-pulse`}></div>
            
            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-spin">
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-teal-400 rounded-full"></div>
              <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading text */}
      {text && (
        <p className="text-gray-600 font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

interface PageLoaderProps {
  role?: 'customer' | 'supplier' | 'admin';
}

export const PageLoader: React.FC<PageLoaderProps> = ({ role = 'customer' }) => {
  const getThemeClasses = (role: string) => {
    switch (role) {
      case 'supplier':
        return {
          background: 'bg-gradient-to-br from-purple-50 via-indigo-100 via-blue-100 to-purple-200',
          textPrimary: 'text-purple-600',
          textSecondary: 'text-gray-500'
        };
      case 'admin':
        return {
          background: 'bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-100',
          textPrimary: 'text-gray-700',
          textSecondary: 'text-gray-500'
        };
      default: // customer
        return {
          background: 'bg-gradient-to-br from-white via-blue-50 via-green-50 to-teal-100',
          textPrimary: 'text-teal-600',
          textSecondary: 'text-gray-500'
        };
    }
  };

  const theme = getThemeClasses(role);

  return (
    <div className={`min-h-screen ${theme.background} flex items-center justify-center`}>
      <div className="text-center">
        <LoadingSpinner size="lg" text="Loading S-Hub..." />
        <div className="mt-8 space-y-2">
          <div className={`${theme.textPrimary} font-semibold`}>S-Hub Manufacturing Portal</div>
          <div className={`${theme.textSecondary} text-sm`}>Preparing your workspace...</div>
        </div>
      </div>
    </div>
  );
};