import React from 'react';

export default function Timer({ seconds }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <>
      {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
    </>
  );
}
