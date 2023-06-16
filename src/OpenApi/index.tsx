import React from 'react';

interface OpenApiProps {
  schema: string;
  fileType?: 'yaml' | 'json';
}

export function OpenApi({fileType = "json", schema}: OpenApiProps) {
  return <div>Open Api</div>
}