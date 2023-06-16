import React from 'react';

interface OpenApiProps {
  schema: string;
  fileType?: 'yaml' | 'json';
}

export function OpenApi(props: OpenApiProps) {
  return <div>Open Api</div>
}