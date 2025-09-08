// Simple test to verify ModularWebsiteGenerator can be imported
import React from 'react';
import ModularWebsiteGenerator from './ModularWebsiteGenerator';

const TestComponent = () => {
  return (
    <div>
      <h1>Testing ModularWebsiteGenerator Import</h1>
      <ModularWebsiteGenerator 
        selectedContact={{ id: 'test', name: 'Test Contact' }}
        onWebsiteGenerated={() => {}}
        onClose={() => {}}
      />
    </div>
  );
};

export default TestComponent;
