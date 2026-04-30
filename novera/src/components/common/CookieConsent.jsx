import React, { useState, useEffect } from 'react';

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {

        const consent = localStorage.getItem('cookieConsent');
        if (!consent) {

            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAction = (choice) => {
        localStorage.setItem('cookieConsent', choice);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="cookie-banner">
            <div className="cookie-content">
                <h3>Cookie Preferences</h3>
                <p>
                    We use cookies to enhance your 3D design experience and analyze our traffic.
                    Choose your preferences to continue.
                </p>
            </div>
            <div className="cookie-actions">
                <button
                    className="cookie-btn reject"
                    onClick={() => handleAction('rejected')}
                >
                    Reject Optional
                </button>
                <button
                    className="cookie-btn accept"
                    onClick={() => handleAction('accepted')}
                >
                    Accept All
                </button>
            </div>
        </div>
    );
}
