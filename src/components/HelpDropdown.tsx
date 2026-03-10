'use client';

import { useState, useRef, useEffect } from 'react';

interface DropdownOption {
  label: string;
  icon: React.ReactNode;
  href: string;
  ariaLabel?: string;
}

interface HelpDropdownProps {
  buttonLabel?: string;
  buttonClassName?: string;
}

export function HelpDropdown({ buttonLabel = 'Get Help', buttonClassName = '' }: HelpDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const options: DropdownOption[] = [
    {
      label: 'Email Support',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      href: 'mailto:contact@vocaband.com?subject=Support%20Request%20-%20Vocaband&body=Hi%20Waseem%2C%0A%0AI%20need%20help%20with%3A%20%5Bdescribe%5D',
      ariaLabel: 'Email Vocaband Support',
    },
    {
      label: 'Chat on WhatsApp',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.698c1.005.572 1.913.845 3.037.845 3.179-.002 5.767-2.587 5.767-5.766.001-3.187-2.575-5.77-5.998-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-2.846-.848-.916-.392-1.528-1.315-1.764-1.645-.237-.329-.398-.548-.149-1.028.249-.479.748-.628.948-.868.199-.239.339-.329.448-.199.11.13.748.748.963.963.215.215.329.329.559.199.23-.13.958-.329 1.479-.849.519-.519.688-.878.838-1.098.149-.219.269-.219.419-.109.149.11.629.599.849.849.219.25.549.389.748.629.199.239.239.548.089.953z"/>
        </svg>
      ),
      href: 'https://wa.me/971534260632',
      ariaLabel: 'Chat on WhatsApp',
    },
  ];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onBlur={(e) => {
          // Delay closing to allow option clicks to register
          setTimeout(() => setIsOpen(false), 150);
        }}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isOpen
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        } ${buttonClassName}`}
        aria-label="Get help"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 0-1.79 1-4 3-2.742 0-3.523-2.029-3.523-4 0-.699.247-1.34.698-1.815.449-.473.965-1.077 1.423-1.776-.09-.312-.19-.6-.295-.872-.107-.32.18-.654.252-1.004.098-.352.247-.7.446-1.068l-.768-1.537c-.34-.68-.682-1.36-1.022-2.04-.24-.48-.479-.96-.718-1.438-.6-1.228-1.423-2.523-1.423-3.95 0-1.31.774-2.4 2.09-2.96.874-.086 1.766-.127 2.642-.127.949 0 1.876.127 2.643.382.632.802.925 1.654.925 2.57 0 1.047-.59 1.91-1.488 2.342-.898.428-2.427.693-3.488.993-1.06-.3-2.08-.578-3.024-1.006-.962-.44-1.847-.94-2.642-1.494-.795-.553-1.582-1.105-2.358-1.648-1.375-.969-3.173-1.422-5.165-1.28-1.997.142-4.025.418-6.05.873-2.025.455-4.03 1.21-6.046 1.878-2.015.666-4.042 1.343-6.046 2.028-.995.353-1.994.745-2.968 1.173-1.485.86-2.937 1.734-4.358 2.363-.714.317-1.429.64-2.142.957-.715.317-1.43.64-2.143.957-.715.317-1.43.64-2.143.957-.715.317-1.429.64-2.143.957z" />
        </svg>
        <span>{buttonLabel}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          role="menu"
          aria-label="Help options"
        >
          {options.map((option) => (
            <a
              key={option.label}
              href={option.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              role="menuitem"
              aria-label={option.ariaLabel}
              onClick={() => setIsOpen(false)}
            >
              {option.icon}
              <span>{option.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
