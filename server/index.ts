import { buildApp, defaultStaticRoot } from './app';
import {
  createConfiguredAudioTranscriptionProvider,
  createHttpAudioTranscriptionProvider,
  createWorkspaceService
} from './workspace-service';
import {
  createSupabaseClients,
  createSupabaseWorkspaceRepository,
  readSupabaseServerConfig
} from './supabase-repository';

async function main() {
  const config = readSupabaseServerConfig();
  const clients = createSupabaseClients(config);
  const repository = createSupabaseWorkspaceRepository(clients.serviceClient);
  const audioProvider = config.audioTranscription
    ? createHttpAudioTranscriptionProvider({
      name: config.audioTranscription.providerName,
      endpointUrl: config.audioTranscription.endpointUrl,
      apiKey: config.audioTranscription.apiKey
    })
    : createConfiguredAudioTranscriptionProvider(process.env);
  const service = createWorkspaceService(repository, undefined, audioProvider);
  const app = buildApp({
    service,
    resolveUserId: clients.resolveUserId,
    authConfig: clients.authConfig,
    staticRoot: defaultStaticRoot()
  });
  const port = Number(process.env.PORT ?? 5174);
  await app.listen({ host: '0.0.0.0', port });
  console.log(`Mycelium server listening on http://localhost:${port}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
