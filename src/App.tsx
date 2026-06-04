import { usePhotoProject } from './hooks/usePhotoProject';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AppHeader } from './components/AppHeader';
import { FilterBar } from './components/FilterBar';
import { PhotoGrid } from './components/PhotoGrid';
import { DetailPanel } from './components/DetailPanel';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { StandardSelectModal } from './components/StandardSelectModal';
import { ToastNotification } from './components/ToastNotification';
import { PrintLedger } from './components/LedgerPrint';
import { STANDARDS } from './constants/standards';
import { Ic } from './components/Icons';

export default function App() {
  const p = usePhotoProject();

  if (p.mode === 'welcome' || p.mode === 'select_std') {
    return (
      <WelcomeScreen
        mode={p.mode}
        standardSelectMode={p.standardSelectMode}
        onOpenFolder={p.handleOpenFolder}
        onNewProject={p.handleNewProject}
        onStandardChosen={p.handleStandardChosen}
        onBack={() => p.setMode('welcome')}
      />
    );
  }

  const activeStd = p.selectedStandard ? STANDARDS[p.selectedStandard] : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden animate-fadeIn bg-slate-100">
      {p.isProcessing && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center no-print">
          <div className="spinner mb-4" />
          <span className="text-white text-xs font-bold tracking-widest uppercase">{p.processMsg}</span>
        </div>
      )}

      {p.isDragOver && (
        <div className="drop-overlay animate-fadeIn">
          <div className="bg-white p-12 rounded-2xl shadow-2xl text-center border border-slate-100 animate-scaleIn">
            <Ic k="upload" size={48} cls="text-blue-600 mx-auto mb-4 animate-bounce" />
            <p className="font-bold text-slate-700">写真をドロップして追加</p>
          </div>
        </div>
      )}

      <AppHeader
        activeStd={activeStd}
        onChangeStdClick={() => p.setIsChangeStdModalOpen(true)}
        onRename={p.handleRename}
        onMerge={p.handleMerge}
        onCloseProject={p.handleCloseProject}
      />

      <div 
        className="flex flex-1 overflow-hidden"
        onDragOver={e => { 
          e.preventDefault(); 
          const hasFiles = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files'); 
          if (!p.isProcessing && hasFiles && !p.draggedId) p.setIsDragOver(true); 
        }}
        onDragLeave={() => p.setIsDragOver(false)}
        onDrop={e => { 
          e.preventDefault(); 
          p.setIsDragOver(false); 
          if (!p.draggedId && e.dataTransfer.files.length) p.processDropFiles(e.dataTransfer.files); 
        }}
      >
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <FilterBar
            rootHandleName={p.rootHandle?.name}
            fCategory={p.fCategory}
            setFCategory={p.setFCategory}
            fWorkType={p.fWorkType}
            setFWorkType={p.setFWorkType}
            fType={p.fType}
            setFType={p.setFType}
            fSubdivision={p.fSubdivision}
            setFSubdivision={p.setFSubdivision}
            fErr={p.fErr}
            setFErr={p.setFErr}
            photos={p.photos}
            filteredPhotosCount={p.filteredPhotos.length}
            errorCount={p.errorCount}
            onSelectAll={() => p.setSelectedIds(new Set(p.filteredPhotos.map(ph => ph.id)))}
            onClearSelection={() => p.setSelectedIds(new Set())}
          />

          <PhotoGrid
            photos={p.photos}
            paginatedPhotos={p.paginatedPhotos}
            selectedIds={p.selectedIds}
            draggedId={p.draggedId}
            setDraggedId={p.setDraggedId}
            handlePageDragOver={p.handlePageDragOver}
            handlePageDragLeave={p.handlePageDragLeave}
            currentPage={p.currentPage}
            setCurrentPage={p.setCurrentPage}
            totalPages={p.totalPages}
            setPhotos={p.setPhotos}
            handlePhotoClick={p.handlePhotoClick}
            setPreviewPhoto={p.setPreviewPhoto}
          />
        </main>

        <DetailPanel
          selectedIds={p.selectedIds}
          photos={p.photos}
          onDelete={p.handleDelete}
          getDraftVal={p.getDraftVal}
          handleDraftChange={p.handleDraftChange}
          applyDraft={p.applyDraft}
          onUpdateField={p.updateField}
          onSelectReferenceFile={p.handleSelectReferenceFile}
          selectedStandard={p.selectedStandard || ""}
          onCloseProject={p.handleCloseProject}
        />
      </div>

      <div className="status-bar no-print flex items-center justify-between bg-slate-900 border-t border-slate-800 text-[10px] text-slate-400 font-bold px-6 py-2">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-emerald-400"><Ic k="check" size={12} /> JS基準適合</span>
          <span className="flex items-center gap-1.5"><Ic k="hardDrive" size={12} /> {p.rootHandle?.name}</span>
          <span className="flex items-center gap-1.5"><Ic k="camera" size={12} /> {p.photos.length}枚</span>
          {p.errorCount > 0 && <span className="flex items-center gap-1.5 text-orange-400"><Ic k="alertCircle" size={12} /> 未完了 {p.errorCount}件</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>{activeStd?.versionTag}</span>
          <span>v3.11.1</span>
        </div>
      </div>

      <ImagePreviewModal
        previewPhoto={p.previewPhoto}
        onClose={() => p.setPreviewPhoto(null)}
      />

      <StandardSelectModal
        isOpen={p.isChangeStdModalOpen}
        onClose={() => p.setIsChangeStdModalOpen(false)}
        onStandardChange={p.handleStandardChange}
      />

      <ToastNotification toast={p.toast} />

      <div className="hidden print:block">
        {activeStd && <PrintLedger photos={p.photos} std={activeStd} />}
      </div>
    </div>
  );
}
