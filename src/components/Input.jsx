import React from 'react';

const Input = ({ type = 'text', placeholder, value, onChange, className = '' }) => {
    return (
        <input
            type={type}
            className={`input-field ${className}`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
    );
};

export default Input;
