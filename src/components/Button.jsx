import React from 'react';

const Button = ({ children, variant = 'primary', fullWidth, onClick, className = '' }) => {
    return (
        <button
            className={`btn btn-${variant} ${fullWidth ? 'btn-full' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

export default Button;
