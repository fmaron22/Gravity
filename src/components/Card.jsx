import React from 'react';

const Card = ({ children, glass = false, className = '' }) => {
    return (
        <div className={`card ${glass ? 'card-glass' : ''} ${className}`}>
            {children}
        </div>
    );
};

export default Card;
