import React from 'react';
import Xarrow from 'react-xarrows';

const ConnectionArrow = ({ connection, isTemporary = false }) => {
  const commonProps = {
    start: connection.start,
    end: connection.end,
    strokeWidth: 2,
    path: "smooth",
    curveness: 0.8,
    headSize: 5,
    startAnchor: "right",
    endAnchor: "left",
    zIndex: 5,
  };

  if (isTemporary) {
    return <Xarrow {...commonProps} color="#88aaff" dashness={true} />;
  }

  return <Xarrow {...commonProps} color="#556688" />;
};

export default ConnectionArrow;