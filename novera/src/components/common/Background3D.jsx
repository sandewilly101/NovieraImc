import React from 'react';

const Background3D = () => {

    const objects = [...Array(12)].map((_, i) => ({
        id: i,
        type: ['cube', 'ring', 'fragment'][i % 3],
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 10}s`,
        duration: `${20 + Math.random() * 20}s`,
        size: 0.5 + Math.random() * 1.5
    }));

    return (
        <div className="dp-bg-elements">
            {objects.map(obj => (
                <div
                    key={obj.id}
                    className={`dp-floating-obj dp-obj-${obj.type}`}
                    style={{
                        top: obj.top,
                        left: obj.left,
                        animationDelay: obj.delay,
                        animationDuration: obj.duration,
                        transform: `scale(${obj.size})`
                    }}
                />
            ))}
        </div>
    );
};

export default Background3D;
