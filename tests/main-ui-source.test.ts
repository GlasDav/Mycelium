import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('new note capture uses an editable title field and markdown editor', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /noteTitle/);
  assert.match(source, /placeholder="Title\.\.\."/);
  assert.match(source, /aria-label="Note title"/);
  assert.match(source, /<MarkdownEditor/);
  assert.match(source, /<MarkdownPreview/);
});

test('notes sidebar has independently collapsible filters', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /filtersCollapsed/);
  assert.match(source, /note-filter-panel/);
  assert.match(source, /sidebar-note-row/);
});

test('sidebar note clicks load the note into the note workbench', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /<FilePlus2\/>\s*Note/);
  assert.doesNotMatch(source, /<FilePlus2\/>\s*New note/);
  assert.match(source, /setNoteTitle\(note\.title\)/);
  assert.match(source, /setDraft\(note\.body\)/);
  assert.match(source, /setViewMode\('notes'\)/);
});

test('note workbench does not ask for source or claim validity metadata', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const workbenchStart = source.indexOf('note-workbench');
  const sideStart = source.indexOf('<aside className="note-side">', workbenchStart);
  assert(workbenchStart >= 0 && sideStart > workbenchStart, 'note workbench source is missing');
  const capture = source.slice(workbenchStart, sideStart);

  assert.doesNotMatch(capture, /<span>Source<\/span>/);
  assert.doesNotMatch(capture, /<span>Applies from<\/span>/);
  assert.doesNotMatch(capture, /<span>Applies to<\/span>/);
  assert.doesNotMatch(capture, /<span>Horizon<\/span>/);
  assert.match(capture, /<span>Observed<\/span>/);
  assert.match(capture, /<span>Location<\/span>/);
  assert.match(capture, /<option value="personal">Personal<\/option>/);
  assert.match(capture, /<option value="team">Team<\/option>/);
  assert.match(capture, /<option value="organization">Organisation<\/option>/);
  assert.match(capture, /accessScope === 'team'/);
  assert.match(capture, /activeTeamMemberships/);
  assert.match(capture, /label="Securities\/Tickers"/);
  assert.match(capture, /label="Industries\/Sectors"/);
  assert.match(capture, /label="Watchlists"/);
  assert.match(capture, /label="Participants"/);
});

test('organization admin page is gated to org admins and exposes lifecycle controls', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const appReturnStart = source.indexOf('return <main');
  const appReturnEnd = source.indexOf('function NotesSidebar');
  assert(appReturnStart >= 0 && appReturnEnd > appReturnStart, 'App render source is missing');
  const appReturn = source.slice(appReturnStart, appReturnEnd);

  assert.match(source, /type ViewMode = 'notes' \| 'dashboard' \| 'map' \| 'archive' \| 'admin'/);
  assert.match(appReturn, /user\.orgRole === 'admin'/);
  assert.match(appReturn, /setViewMode\('admin'\)/);
  assert.match(appReturn, /viewMode === 'admin' && <AdminPage/);
  assert.match(source, /function AdminPage/);
  assert.match(source, /loadAdminOrganization/);
  assert.match(source, /createAdminTeam/);
  assert.match(source, /updateAdminTeam/);
  assert.match(source, /archiveAdminTeam/);
  assert.match(source, /createAdminInvite/);
  assert.match(source, /cancelAdminInvite/);
  assert.match(source, /updateAdminMember/);
  assert.match(source, /replaceAdminMemberTeams/);
  assert.match(source, /Organisation admin/);
  assert.match(source, /Invite/);
  assert.match(source, /Deactivate/);
  assert.match(source, /Archive/);
});

test('notes sidebar filters do not include source metadata controls', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const sidebarStart = source.indexOf('function NotesSidebar');
  const sidebarEnd = source.indexOf('function FilterSelect', sidebarStart);
  assert(sidebarStart >= 0 && sidebarEnd > sidebarStart, 'NotesSidebar source is missing');
  const sidebar = source.slice(sidebarStart, sidebarEnd);

  assert.doesNotMatch(sidebar, /label="Source"/);
  assert.doesNotMatch(sidebar, /sourceType/);
  assert.doesNotMatch(sidebar, /<option value="sourceType">source<\/option>/);
  assert.match(sidebar, /label="Industry"/);
  assert.match(sidebar, /label="Watchlist"/);
  assert.match(sidebar, /label="Participant"/);
  assert.match(sidebar, /label="Location"/);
  assert.match(sidebar, /accessScope/);
});

test('markdown editor exposes display editing only with undo and redo controls', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const editorStart = source.indexOf('function MarkdownEditor');
  const editorEnd = source.indexOf('function MarkdownPreview');
  assert(editorStart >= 0 && editorEnd > editorStart, 'MarkdownEditor source is missing');
  const editor = source.slice(editorStart, editorEnd);

  assert.match(editor, /markdown-display-editor/);
  assert.match(editor, /contentEditable/);
  assert.match(editor, /contentEditable=\{!readOnly\}/);
  assert.match(editor, /aria-readonly=\{readOnly\}/);
  assert.match(editor, /focusSignal/);
  assert.doesNotMatch(editor, /<textarea/);
  assert.match(editor, /Undo2/);
  assert.match(editor, /Redo2/);
  assert.match(editor, /execCommand\('undo'\)/);
  assert.match(editor, /execCommand\('redo'\)/);
  assert.match(editor, /key === 'z'/);
  assert.match(editor, /key === 'y'/);
});

test('markdown editor exposes slash command palette keyboard wiring', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const editorStart = source.indexOf('function MarkdownEditor');
  const editorEnd = source.indexOf('function MarkdownPreview');
  assert(editorStart >= 0 && editorEnd > editorStart, 'MarkdownEditor source is missing');
  const editor = source.slice(editorStart, editorEnd);

  assert.match(editor, /slashMarkdownCommands/);
  assert.match(editor, /markdown-slash-palette/);
  assert.match(editor, /ArrowDown/);
  assert.match(editor, /ArrowUp/);
  assert.match(editor, /Escape/);
});

test('note workbench has a new note action and no sample prompt buttons', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /function startNewNote/);
  assert.match(source, /onClick=\{startNewNote\}/);
  assert.match(source, />New note</);
  assert.match(source, /setSelectedNoteId\(''\)/);
  assert.doesNotMatch(source, /className="samples"/);
  assert.doesNotMatch(source, /Use sample/);
});

test('note import is an inline notes panel without adding a rail mode', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const appReturnStart = source.indexOf('return <main');
  const appReturnEnd = source.indexOf('function NotesSidebar');
  assert(appReturnStart >= 0 && appReturnEnd > appReturnStart, 'App render source is missing');
  const appReturn = source.slice(appReturnStart, appReturnEnd);
  const notesStart = appReturn.indexOf("viewMode === 'notes' && <NotesPage");
  const dashboardStart = appReturn.indexOf("viewMode === 'dashboard' && <DashboardPage");
  assert(notesStart >= 0 && dashboardStart > notesStart, 'Notes page source is missing');
  const notesPage = appReturn.slice(notesStart, dashboardStart);
  const noteActionsStart = notesPage.indexOf('className="note-panel-actions"');
  const noteActionsEnd = notesPage.indexOf('</div>', noteActionsStart);
  assert(noteActionsStart >= 0 && noteActionsEnd > noteActionsStart, 'Note panel actions source is missing');
  const noteActions = notesPage.slice(noteActionsStart, noteActionsEnd);

  assert.match(source, /import \{ parsePastedNoteImport, type ParsedNoteImport \} from '\.\/note-import'/);
  assert.match(source, /import \{ NOTE_IMPORT_FILE_ACCEPT, readNoteImportFile \} from '\.\/note-import-files'/);
  assert.match(source, /type ViewMode = 'notes' \| 'dashboard' \| 'map' \| 'archive' \| 'admin'/);
  assert.match(notesPage, /noteImportOpen/);
  assert.match(notesPage, /note-import-panel/);
  assert.match(notesPage, /note-import-input/);
  assert.match(notesPage, /type="file"/);
  assert.match(notesPage, /accept=\{NOTE_IMPORT_FILE_ACCEPT\}/);
  assert.match(notesPage, /Choose TXT, Markdown, DOCX, or PDF/);
  assert.match(notesPage, /note-import-preview/);
  assert.match(notesPage, /note-import-actions/);
  assert.match(notesPage, /note-import-warning/);
  assert(noteActions.indexOf('history-note-action') < noteActions.indexOf('note-import-action'));
  assert(noteActions.indexOf('note-import-action') < noteActions.indexOf('new-note-action'));
});

test('note import parses pasted content and applies only to workbench state', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const applyStart = source.indexOf('function applyImportedNoteToWorkbench');
  const applyEnd = source.indexOf('async function signOut', applyStart);
  const fileStart = source.indexOf('async function importNoteFile');
  const fileEnd = source.indexOf('function applyImportedNoteToWorkbench', fileStart);
  assert(applyStart >= 0 && applyEnd > applyStart, 'Import apply handler source is missing');
  assert(fileStart >= 0 && fileEnd > fileStart, 'File import handler source is missing');
  const applySource = source.slice(applyStart, applyEnd);
  const fileSource = source.slice(fileStart, fileEnd);

  assert.match(source, /parsePastedNoteImport\(noteImportText\)/);
  assert.match(fileSource, /readNoteImportFile\(file\)/);
  assert.match(fileSource, /setParsedFileNoteImport\(imported\)/);
  assert.match(fileSource, /setNoteImportFileError\(''\)/);
  assert.match(fileSource, /setNoteImportFileError\(error instanceof Error \? error\.message : String\(error\)\)/);
  assert.match(source, /const parsedImport = parsedFileNoteImport \?\? parsedNoteImport/);
  assert.match(source, />Apply to workbench</);
  assert.match(applySource, /setSelectedNoteId\(''\)/);
  assert.match(applySource, /setNoteTitle\(imported\.title \?\? ''\)/);
  assert.match(applySource, /setDraft\(imported\.body\)/);
  assert.match(applySource, /setObservedAt\(imported\.observedAt \?\? today\(\)\)/);
  assert.match(source, /function metadataFromParsedNoteImport\(imported: ParsedNoteImport\): FrontendMetadata/);
  assert.match(source, /linkedEntities: imported\.linkedEntities/);
  assert.match(source, /function noteImportWarningMessage/);
  assert.match(source, /warning\.message/);
  assert.match(applySource, /applyWorkbenchMetadata\(metadataFromParsedNoteImport\(imported\)\)/);
  assert.match(applySource, /setNoteHistory\(\[\]\)/);
  assert.match(applySource, /setHistoryDrawerOpen\(false\)/);
  assert.match(applySource, /setNoteSourceType\(IMPORTED_NOTE_SOURCE_TYPE\)/);
  assert.doesNotMatch(applySource, /createNote\(/);
  assert.doesNotMatch(fileSource, /createNote\(/);
  assert.match(source, /async function saveWorkbenchNote\(\)[\s\S]*await addNote\(\)/);
  assert.match(source, /onClick=\{saveWorkbenchNote\}/);
});

test('imported source type is saved only through new-note creation', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const draftEffectStart = source.indexOf('const draftInput: FrontendDraftPayload');
  const draftEffectEnd = source.indexOf('async function saveWorkbenchNote', draftEffectStart);
  const addStart = source.indexOf('async function addNote');
  const addEnd = source.indexOf('async function saveExistingNote', addStart);
  const saveExistingStart = source.indexOf('async function saveExistingNote');
  const saveExistingEnd = source.indexOf('async function openNoteHistory', saveExistingStart);
  const restoreStart = source.indexOf('async function restoreNoteDraft');
  const restoreEnd = source.indexOf('  useEffect(() => {', restoreStart + 1);
  const newNoteStart = source.indexOf('function startNewNote');
  const newNoteEnd = source.indexOf('async function signOut', newNoteStart);
  const selectStart = source.indexOf('onSelectNote={note => {');
  const selectEnd = source.indexOf('    />', selectStart);

  assert(draftEffectStart >= 0 && draftEffectEnd > draftEffectStart, 'Draft payload source is missing');
  assert(addStart >= 0 && addEnd > addStart, 'Add note source is missing');
  assert(saveExistingStart >= 0 && saveExistingEnd > saveExistingStart, 'Existing note save source is missing');
  assert(restoreStart >= 0 && restoreEnd > restoreStart, 'Draft restore source is missing');
  assert(newNoteStart >= 0 && newNoteEnd > newNoteStart, 'New note source is missing');
  assert(selectStart >= 0 && selectEnd > selectStart, 'Note selection source is missing');

  assert.match(source, /const DEFAULT_NOTE_SOURCE_TYPE = 'Typed note'/);
  assert.match(source, /const IMPORTED_NOTE_SOURCE_TYPE = 'Meeting transcript'/);
  assert.match(source, /const \[noteSourceType, setNoteSourceType\] = useState\(DEFAULT_NOTE_SOURCE_TYPE\)/);
  assert.match(source.slice(addStart, addEnd), /sourceType: noteSourceType/);
  assert.doesNotMatch(source.slice(saveExistingStart, saveExistingEnd), /sourceType/);
  assert.doesNotMatch(source.slice(draftEffectStart, draftEffectEnd), /sourceType/);
  assert.match(source.slice(restoreStart, restoreEnd), /setNoteSourceType\(DEFAULT_NOTE_SOURCE_TYPE\)/);
  assert.match(source.slice(newNoteStart, newNoteEnd), /setNoteSourceType\(DEFAULT_NOTE_SOURCE_TYPE\)/);
  assert.match(source.slice(selectStart, selectEnd), /setNoteSourceType\(DEFAULT_NOTE_SOURCE_TYPE\)/);
});

test('note workbench supports explicit saved-note editing and server draft recovery', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /saveWorkbenchNote/);
  assert.match(source, /updateNote\(/);
  assert.match(source, /loadNoteDraft/);
  assert.match(source, /upsertNoteDraft/);
  assert.match(source, /deleteNoteDraft/);
  assert.match(source, /clearedDraftSignatureRef/);
  assert.match(source, /draftSignature/);
  assert.match(source, /selectedNoteId: note\.id/);
  assert.match(source, /selectedNoteId \? 'Save note' : 'Add note'/);
  assert.match(source, /selectedNoteId \? 'Save note' : 'Add note'/);
  assert.match(source, /onSubmit=\{saveWorkbenchNote\}/);
  assert.match(source, /currentLinkedEntities/);
  assert.match(source, /linkedEntities/);
  assert.match(source, /industries/);
  assert.match(source, /watchlistTags/);
  assert.match(source, /sourcePeople/);
});

test('live extraction suggestions can be added to linked note metadata', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const livePreviewStart = source.indexOf('<article className="panel live-preview">');
  const livePreviewEnd = source.indexOf('<div className="preview-claims">', livePreviewStart);
  assert(livePreviewStart >= 0 && livePreviewEnd > livePreviewStart, 'live preview source is missing');
  const livePreview = source.slice(livePreviewStart, livePreviewEnd);

  assert.match(source, /function addPreviewEntity/);
  assert.match(livePreview, /onClick=\{\(\) => addPreviewEntity\(e\)\}/);
  assert.match(source, /setTickers\(values => addTag\(values/);
  assert.match(source, /setManualThemes\(values => addTag\(values/);
  assert.match(source, /setKpis\(values => addTag\(values/);
});

test('selected saved notes expose a read-only history drawer', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const appReturnStart = source.indexOf('return <main');
  const appReturnEnd = source.indexOf('function NotesSidebar');
  assert(appReturnStart >= 0 && appReturnEnd > appReturnStart, 'App render source is missing');
  const appReturn = source.slice(appReturnStart, appReturnEnd);

  assert.match(source, /loadNoteHistory/);
  assert.match(source, /historyDrawerOpen/);
  assert.match(source, /function NoteHistoryDrawer/);
  assert.match(appReturn, /<NoteHistoryDrawer/);
  assert.match(source, /Previous body/);
  assert.match(source, /changedFields/);
  assert.doesNotMatch(source, /Restore version/);
});

test('left rail modes render notes, dashboard, map, and archive page bodies', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const appReturnStart = source.indexOf('return <main');
  const appReturnEnd = source.indexOf('function NotesSidebar');
  assert(appReturnStart >= 0 && appReturnEnd > appReturnStart, 'App render source is missing');
  const appReturn = source.slice(appReturnStart, appReturnEnd);

  assert.match(source, /type ViewMode = 'notes' \| 'dashboard' \| 'map' \| 'archive' \| 'admin'/);
  assert.match(appReturn, /className=\{`shell page-shell \$\{viewMode\}-page`\}/);
  assert.match(appReturn, /setViewMode\('notes'\)/);
  assert.match(appReturn, /setViewMode\('dashboard'\)/);
  assert(appReturn.indexOf("setViewMode('notes')") < appReturn.indexOf("setViewMode('dashboard')"));
  assert.match(appReturn, /aria-label="Open notes"/);
  assert.match(appReturn, /aria-label="Open dashboard"/);
  assert.match(appReturn, /aria-label="Open relationship map"/);
  assert.match(appReturn, /viewMode === 'notes' && <NotesPage/);
  assert.match(appReturn, /viewMode === 'dashboard' && <DashboardPage/);
  assert.match(appReturn, /viewMode === 'map' && <MapPage/);
  assert.match(appReturn, /viewMode === 'archive' && <ArchivePage/);
  assert.match(appReturn, /viewMode === 'admin' && <AdminPage/);
  assert.doesNotMatch(appReturn, /className="mode-tabs"/);
});

test('note workbench read-only and focus mode states are enforced in controls', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const appReturnStart = source.indexOf('return <main');
  const appReturnEnd = source.indexOf('function NotesSidebar');
  assert(appReturnStart >= 0 && appReturnEnd > appReturnStart, 'App render source is missing');
  const appReturn = source.slice(appReturnStart, appReturnEnd);

  assert.match(source, /editorFocusSignal/);
  assert.match(source, /focusCapture\(\{ focusEditor: true, enableFocusMode: true \}\)/);
  assert.match(source, /function toggleFocusMode/);
  assert.match(source, /viewMode !== 'notes' && focusMode/);
  assert.match(appReturn, /canToggleFocusMode=\{viewMode === 'notes'\}/);
  assert.match(appReturn, /disabled=\{!canEditSelectedNote\}/);
  assert.match(appReturn, /readOnly=\{!canEditSelectedNote\}/);
  assert.match(appReturn, /disabled=\{!canEditSelectedNote\} \/>/);
});

test('premium shell imports context header command palette and status toast', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /ContextHeader/);
  assert.match(source, /CommandPalette/);
  assert.match(source, /StatusToastStack/);
  assert.match(source, /buildContextHeaderModel/);
  assert.match(source, /buildCommandItems/);
  assert.match(source, /onKeyDown/);
  assert.match(source, /key === 'k'/);
  assert.match(source, /setNoteImportOpen\(open => !open\)/);
});

test('dashboard widgets expose drilldown callbacks', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const dashboardStart = source.indexOf('function DashboardPage');
  const dashboardEnd = source.indexOf('function NoteRelationsPanel', dashboardStart);
  assert(dashboardStart >= 0 && dashboardEnd > dashboardStart, 'Dashboard source is missing');
  const dashboardSource = source.slice(dashboardStart, dashboardEnd);

  assert.match(dashboardSource, /onDrilldown/);
  assert.match(dashboardSource, /metric-notes/);
  assert.match(dashboardSource, /metric-relations/);
  assert.match(dashboardSource, /relation-type/);
  assert.match(dashboardSource, /freshness/);
  assert.match(dashboardSource, /source-person/);
});

test('claim review cards capture analyst review notes on every action', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const claimStart = source.indexOf('function ClaimCard');
  const claimEnd = source.indexOf('function RelationshipMap', claimStart);
  assert(claimStart >= 0 && claimEnd > claimStart, 'ClaimCard source is missing');
  const claimCard = source.slice(claimStart, claimEnd);

  assert.match(claimCard, /reviewNote/);
  assert.match(claimCard, /<span>Review note<\/span>/);
  assert.match(claimCard, /value=\{reviewNote\}/);
  assert.match(claimCard, /reviewNote,\s*\n/);
  assert.match(claimCard, /reviewStatus: 'analyst_confirmed', reviewNote/);
  assert.match(claimCard, /reviewStatus: 'analyst_rejected', reviewNote/);
  assert.match(claimCard, /sourcePeople/);
  assert.match(claimCard, /label="Participants"/);
  assert.match(claimCard, /Extraction confidence/);
});

test('relation review cards capture analyst notes and map mode exposes a detail drawer', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const relationStart = source.indexOf('function RelationshipMap');
  const relationEnd = source.indexOf('function Metric', relationStart);
  assert(relationStart >= 0 && relationEnd > relationStart, 'RelationshipMap source is missing');
  const relationSource = source.slice(relationStart, relationEnd);

  assert.match(relationSource, /selectedRelationId/);
  assert.match(relationSource, /relation-detail-drawer/);
  assert.match(relationSource, /Current type/);
  assert.match(relationSource, /Original type/);
  assert.match(relationSource, /Overlap days/);
  assert.match(relationSource, /Evidence strength/);
  assert.match(relationSource, /Review note/);
  assert.match(relationSource, /reviewStatus: 'confirmed', reviewNote/);
  assert.match(relationSource, /reviewStatus: 'dismissed', reviewNote/);
  assert.match(relationSource, /reviewStatus: 'reclassified', type, reviewNote/);
  assert.match(relationSource, /map-filter-bar/);
  assert.match(relationSource, /sourcePersonContext/);
});

test('relationship map exposes timeline, density, lanes, and author/team controls', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const relationStart = source.indexOf('function RelationshipMap');
  const relationEnd = source.indexOf('function Metric', relationStart);
  assert(relationStart >= 0 && relationEnd > relationStart, 'RelationshipMap source is missing');
  const relationSource = source.slice(relationStart, relationEnd);

  assert.match(source, /mapAsOf/);
  assert.match(source, /mapWorkspace/);
  assert.match(source, /mapLoading/);
  assert.match(source, /mapError/);
  assert.match(source, /loadWorkspace\(session,\s*\{\s*asOf: mapAsOf/);
  assert.match(source, /buildMapLaneModel/);
  assert.match(relationSource, /timeline-control/);
  assert.match(relationSource, /map-density-control/);
  assert.match(relationSource, /label="Author"/);
  assert.match(relationSource, /label="Team"/);
  assert.match(relationSource, /className="map-lane current"/);
  assert.match(relationSource, /className="map-lane historical"/);
  assert.match(relationSource, /map-lane-overflow/);
});

test('map filters include author and team fields with as-of active count', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const mapFiltersStart = source.indexOf('interface MapFilters');
  const mapFiltersEnd = source.indexOf('const markdownSanitizeSchema', mapFiltersStart);
  const countStart = source.indexOf('function activeMapFilterCount');
  const countEnd = source.indexOf('function MarkdownEditor', countStart);
  assert(mapFiltersStart >= 0 && mapFiltersEnd > mapFiltersStart, 'MapFilters source is missing');
  assert(countStart >= 0 && countEnd > countStart, 'activeMapFilterCount source is missing');
  const mapFiltersSource = source.slice(mapFiltersStart, mapFiltersEnd);
  const countSource = source.slice(countStart, countEnd);

  assert.match(mapFiltersSource, /authorId\?: string/);
  assert.match(mapFiltersSource, /team\?: string/);
  assert.match(countSource, /mapAsOf/);
  assert.match(countSource, /latestAsOf/);
  assert.match(countSource, /mapAsOf !== latestAsOf/);
});

test('map mutations refresh historical snapshots and density budgets both lanes', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const claimStart = source.indexOf('async function patchClaim');
  const relationStart = source.indexOf('async function patchRelation');
  const previewStart = source.indexOf('function previewNote', relationStart);
  const mapStart = source.indexOf('function RelationshipMap');
  const mapEnd = source.indexOf('function RelationCard', mapStart);
  assert(claimStart >= 0 && relationStart > claimStart && previewStart > relationStart, 'mutation handlers are missing');
  assert(mapStart >= 0 && mapEnd > mapStart, 'RelationshipMap source is missing');
  const claimSource = source.slice(claimStart, relationStart);
  const relationSource = source.slice(relationStart, previewStart);
  const mapSource = source.slice(mapStart, mapEnd);

  assert.match(source, /refreshMapWorkspace/);
  assert.match(claimSource, /refreshMapWorkspace\(next\)/);
  assert.match(relationSource, /refreshMapWorkspace\(next\)/);
  assert.match(mapSource, /currentLane = buildMapLaneModel/);
  assert.match(mapSource, /historicalLane = buildMapLaneModel/);
  assert.doesNotMatch(mapSource, /densityLimits\.graph - currentGraphRelations\.length/);
  assert.doesNotMatch(mapSource, /densityLimits\.list - currentListRelations\.length/);
});

test('relationship map stays dependency-free and uses data-driven node positions', () => {
  const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const relationStart = source.indexOf('function RelationshipMap');
  const relationEnd = source.indexOf('function RelationCard', relationStart);
  assert(relationStart >= 0 && relationEnd > relationStart, 'RelationshipMap source is missing');
  const relationSource = source.slice(relationStart, relationEnd);

  assert.doesNotMatch(packageJson, /react-flow|cytoscape|d3/);
  assert.match(source, /from '\.\/map-layout'/);
  assert.match(relationSource, /--node-x/);
  assert.match(relationSource, /--edge-rotation/);
  assert.doesNotMatch(relationSource, /n\$\{i\}/);
  assert.doesNotMatch(relationSource, /e\$\{i\}/);
  assert.doesNotMatch(styles, /\.n0\b/);
  assert.doesNotMatch(styles, /\.e0\b/);
});

test('notes mode shows only current-note intelligence and dashboard owns broad widgets', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const appReturnStart = source.indexOf('return <main');
  const appReturnEnd = source.indexOf('function NotesSidebar');
  assert(appReturnStart >= 0 && appReturnEnd > appReturnStart, 'App render source is missing');
  const appReturn = source.slice(appReturnStart, appReturnEnd);
  const notesStart = appReturn.indexOf("viewMode === 'notes' && <NotesPage");
  const dashboardStart = appReturn.indexOf("viewMode === 'dashboard' && <DashboardPage");
  assert(notesStart >= 0 && dashboardStart > notesStart, 'Notes and dashboard page bodies are missing');
  const notesPage = appReturn.slice(notesStart, dashboardStart);
  const dashboardPage = appReturn.slice(dashboardStart);

  assert.match(notesPage, /currentNoteClaims/);
  assert.match(source, /relationTouchesSelectedNote/);
  assert.match(source, /claim\.noteId === selectedNoteId/);
  assert.doesNotMatch(notesPage, /Workspace pulse/);
  assert.doesNotMatch(notesPage, /Synthesized view/);
  assert.doesNotMatch(notesPage, /Signals/);
  assert.doesNotMatch(notesPage, /Trust boundary/);
  assert.doesNotMatch(notesPage, /PersonMemoryPanel/);
  assert.match(dashboardPage, /Workspace pulse/);
  assert.match(dashboardPage, /Signals/);
  assert.match(dashboardPage, /PersonMemoryPanel/);
  assert.match(source, /function PersonMemoryPanel/);
  assert.match(source, /Source-person memory/);
});

test('dashboard mode renders scoped research intelligence controls', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const appReturnStart = source.indexOf('return <main');
  const appReturnEnd = source.indexOf('function NotesSidebar');
  assert(appReturnStart >= 0 && appReturnEnd > appReturnStart, 'App render source is missing');
  const appReturn = source.slice(appReturnStart, appReturnEnd);

  assert.match(source, /DashboardScope/);
  assert.match(source, /DashboardRange/);
  assert.match(source, /loadDashboard/);
  assert.match(source, /function DashboardPage/);
  assert.match(source, /dashboard-scope-toggle/);
  assert.match(source, /dashboard-range-toggle/);
  assert.match(source, /dashboard-metric-grid/);
  assert.match(source, /dashboard-insight-grid/);
  assert.match(source, /dashboard-widget-grid/);
  assert.match(source, /dashboard-donut-caption/);
  assert.doesNotMatch(source, /<span>fresh claims<\/span>/);
  assert.match(appReturn, /dashboardScope/);
  assert.doesNotMatch(appReturn, /<DemoGuide/);
});

test('dashboard widget empty states are compact and iconless', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
  const dashboardStart = source.indexOf('function DashboardPage');
  const dashboardEnd = source.indexOf('function NoteRelationsPanel', dashboardStart);
  const personMemoryStart = source.indexOf('function PersonMemoryPanel');
  const personMemoryEnd = source.indexOf('function Metric', personMemoryStart);
  const emptyStateStart = source.indexOf('function EmptyState');
  const emptyStateEnd = source.indexOf('function emptyStateActions', emptyStateStart);

  assert(dashboardStart >= 0 && dashboardEnd > dashboardStart, 'Dashboard source is missing');
  assert(personMemoryStart >= 0 && personMemoryEnd > personMemoryStart, 'PersonMemoryPanel source is missing');
  assert(emptyStateStart >= 0 && emptyStateEnd > emptyStateStart, 'EmptyState source is missing');

  const dashboardSource = source.slice(dashboardStart, dashboardEnd);
  const personMemorySource = source.slice(personMemoryStart, personMemoryEnd);
  const emptyStateSource = source.slice(emptyStateStart, emptyStateEnd);

  assert.match(emptyStateSource, /showIcon\s*=\s*true/);
  assert.match(emptyStateSource, /showIcon\s*&&\s*<Sparkles/);
  assert.match(dashboardSource, /<EmptyState title="No alerts"[^>]+showIcon=\{false\}/);
  assert.match(dashboardSource, /<EmptyState title=\{`No \$\{title\.toLowerCase\(\)\} yet`\}[^>]+showIcon=\{false\}/);
  assert.match(personMemorySource, /<EmptyState title=\{emptyState\.title\}[^>]+showIcon=\{false\}/);
});

test('empty states distinguish no-data states from filtered no-result states with actions', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

  assert.match(source, /emptyStateForNotes/);
  assert.match(source, /emptyStateForRelations/);
  assert.match(source, /emptyStates\['no-graph'\]/);
  assert.match(source, /Save this note to review claims/);
  assert.match(source, /emptyStates\['no-source-person-history'\]/);
  assert.match(source, /actions=\{emptyStateActions/);
  assert.match(source, /clearNoteFilters/);
  assert.match(source, /clearMapFilters/);
  assert.match(source, /setViewMode\('notes'\)/);
});
