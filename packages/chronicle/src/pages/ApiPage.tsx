import { StatusCodes } from 'http-status-codes';
import type { OpenAPIV3 } from 'openapi-types';
import { Navigate } from 'react-router';
import { ApiOverview } from '@/components/api';
import { ApiPageSkeleton } from '@/components/api/ApiSkeleton';
import { findApiOperation, getFirstApiUrl } from '@/lib/api-routes';
import { Head } from '@/lib/head';
import { usePageContext } from '@/lib/page-context';
import { NotFound } from '@/pages/NotFound';
import { RenderError } from '@/pages/RenderError';

interface ApiPageProps {
  slug: string[];
}

export function ApiPage({ slug }: ApiPageProps) {
  const { config, apiSpecs, isLoading, errorStatus, errorMessage } = usePageContext();

  if (errorStatus === StatusCodes.NOT_FOUND) return <NotFound />;
  if (errorStatus) return <RenderError message={errorMessage} />;
  if (isLoading) return <ApiPageSkeleton />;
  if (apiSpecs.length === 0) return <NotFound />;

  if (slug.length === 0) {
    const firstUrl = getFirstApiUrl(apiSpecs);
    if (firstUrl) return <Navigate to={firstUrl} replace />;
    return <NotFound />;
  }

  const match = findApiOperation(apiSpecs, slug);
  if (!match) return <NotFound />;

  const operation = match.operation as OpenAPIV3.OperationObject;
  const title =
    operation.summary ?? `${match.method.toUpperCase()} ${match.path}`;

  return (
    <>
      <Head title={title} description={operation.description} config={config} />
      <ApiOverview
        method={match.method}
        path={match.path}
        operation={match.operation}
        serverUrl={match.spec.server.url}
        specName={match.spec.name}
        auth={match.spec.auth}
      />
    </>
  );
}

