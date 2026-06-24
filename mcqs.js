/*! AI MCQs JSON Tool — library loader (CSS + JS auto-loader).
 *  Load this ONE script anywhere on your page (head or body), then drop the
 *  host element into any post/page:
 *
 *    <div class="smartboard-page-wrap">
 *      <div data-height="100vh" id="smartboard-host"></div>
 *    </div>
 *
 *  This loader auto-loads the matching mcqs.css + mcqs.app.js from the same
 *  CDN folder, plus the third-party libraries the tool needs. Heavy libs are
 *  the same pinned versions used by the original standalone tool.
 *
 *  data-height: any CSS length ("100vh", "640px", "80vh") or a bare number
 *               (treated as px). Omit it to let the tool grow with its content.
 *
 *  Note: the tool uses global element IDs, so only ONE instance is mounted
 *  per page (the first matching host).
 */
(function(){
"use strict";

// Locate this script so we can auto-load siblings (mcqs.css / mcqs.app.js)
// from the exact same CDN folder.
var THIS = document.currentScript || (function(){var s=document.getElementsByTagName('script');return s[s.length-1];})();
var BASE = (THIS && THIS.src) ? THIS.src.replace(/[^\/]*$/,'') : '';

/* ---- markup injected into the host element ---- */
var MARKUP = `
<div class="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold flex items-center gap-2 justify-center sm:justify-start">
                <i data-lucide="file-json-2"></i> AI MCQs JSON Tool
            </h1>
            <p class="text-blue-100 text-sm mt-1">Split, combine, edit, add figures, or build quiz embeds — with GitHub sync</p>
        </div>
        <div class="mt-4 sm:mt-0 bg-white/20 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm">
            v3.1 • Quiz Builder
        </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gray-200 overflow-x-auto">
        <button id="tab-btn-split" class="flex-1 py-4 text-center tab-active transition-colors flex items-center justify-center gap-2 whitespace-nowrap px-3" onclick="switchTab('split')">
            <i data-lucide="scissors" class="w-4 h-4"></i> Split JSON
        </button>
        <button id="tab-btn-combine" class="flex-1 py-4 text-center tab-inactive transition-colors flex items-center justify-center gap-2 whitespace-nowrap px-3" onclick="switchTab('combine')">
            <i data-lucide="blocks" class="w-4 h-4"></i> Combine JSONs
        </button>
        <button id="tab-btn-quizbuilder" class="flex-1 py-4 text-center tab-inactive transition-colors flex items-center justify-center gap-2 whitespace-nowrap px-3" onclick="switchTab('quizbuilder')">
            <i data-lucide="package-plus" class="w-4 h-4"></i> Quiz Builder
        </button>
        <button id="tab-btn-editor" class="flex-1 py-4 text-center tab-inactive transition-colors flex items-center justify-center gap-2 whitespace-nowrap px-3" onclick="switchTab('editor')">
            <i data-lucide="pencil-ruler" class="w-4 h-4"></i> Question Editor
        </button>
        <button id="tab-btn-figures" class="flex-1 py-4 text-center tab-inactive transition-colors flex items-center justify-center gap-2 whitespace-nowrap px-3" onclick="switchTab('figures')">
            <i data-lucide="image-plus" class="w-4 h-4"></i> Figure Updater
        </button>
        <button id="tab-btn-builder" class="flex-1 py-4 text-center tab-inactive transition-colors flex items-center justify-center gap-2 whitespace-nowrap px-3" onclick="switchTab('builder')">
            <i data-lucide="layout-template" class="w-4 h-4"></i> Frontend Builder
        </button>
    </div>

    <!-- Content Area -->
    <div class="p-6 sm:p-8">

        <!-- ==================== SPLIT TAB ==================== -->
        <div id="tab-split" class="block space-y-6">
            <div class="flex flex-col sm:flex-row gap-6">
                <div class="flex-1">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Upload Source JSON</label>
                    <div id="split-dropzone" class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                        <input type="file" id="split-file" accept=".json" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                        <i data-lucide="upload-cloud" class="w-10 h-10 mx-auto text-gray-400 mb-3"></i>
                        <p class="text-sm text-gray-600 font-medium" id="split-file-name">Click or drag JSON file here</p>
                        <p class="text-xs text-gray-400 mt-1">Must be an aimcq formatted JSON</p>
                    </div>
                </div>
                <div class="w-full sm:w-1/3 flex flex-col justify-center">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Questions per file</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i data-lucide="layers" class="w-4 h-4 text-gray-400"></i>
                        </div>
                        <input type="number" id="split-chunk-size" value="50" min="1" max="1000" class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-gray-50">
                    </div>
                    <button id="btn-split" class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
                        <i data-lucide="scissors-line-dashed" class="w-5 h-5"></i> Split File
                    </button>
                </div>
            </div>
            <div id="split-results-container" class="hidden mt-8 border-t border-gray-100 pt-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-800">Generated Files (<span id="split-count">0</span>)</h3>
                    <button id="btn-download-all" class="text-sm bg-green-100 hover:bg-green-200 text-green-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                        <i data-lucide="folder-archive" class="w-4 h-4"></i> Download All (ZIP)
                    </button>
                </div>
                <div id="split-file-list" class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2"></div>
            </div>
        </div>

        <!-- ==================== COMBINE TAB ==================== -->
        <div id="tab-combine" class="hidden space-y-6">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Upload Multiple JSON Files</label>
                <div id="combine-dropzone" class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                    <input type="file" id="combine-files" accept=".json" multiple class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                    <i data-lucide="files" class="w-10 h-10 mx-auto text-gray-400 mb-3"></i>
                    <p class="text-sm text-gray-600 font-medium" id="combine-files-name">Click or drag multiple JSON files here</p>
                    <p class="text-xs text-gray-400 mt-1">Select multiple files at once</p>
                </div>
            </div>
            <div id="combine-file-preview" class="hidden">
                <p class="text-sm font-semibold text-gray-700 mb-2">Selected Files:</p>
                <div id="combine-file-list" class="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar"></div>
            </div>
            <button id="btn-combine" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
                <i data-lucide="combine" class="w-5 h-5"></i> Combine JSONs
            </button>
            <div id="combine-results-container" class="hidden mt-8 border-t border-gray-100 pt-6">
                <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-center">
                    <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
                        <i data-lucide="check-circle-2" class="w-8 h-8 text-green-500"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-800 mb-1">Files Successfully Combined</h3>
                    <p class="text-sm text-gray-600 mb-6" id="combine-stats">Merged 0 files containing 0 total questions.</p>
                    <button id="btn-download-combined" class="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all">
                        <i data-lucide="download" class="w-5 h-5"></i> Download Combined JSON
                    </button>
                </div>
            </div>
        </div>


        <!-- ==================== QUIZ BUILDER TAB ==================== -->
        <div id="tab-quizbuilder" class="hidden space-y-5">

            <!-- Intro -->
            <div class="bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-start gap-3">
                <i data-lucide="package-plus" class="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5"></i>
                <div class="text-sm text-teal-900">
                    <p class="font-semibold mb-0.5">Quiz Builder</p>
                    <p class="text-teal-700 text-xs leading-relaxed">
                        Build a brand-new quiz JSON by hand-picking questions from one or more
                        source files. Drag questions from the <b>source</b> into your
                        <b>new quiz</b>, reorder them, then download the result.
                    </p>
                </div>
            </div>

            <!-- Step 1: Load source files -->
            <div class="space-y-3">
                <div class="flex items-center gap-3 flex-wrap">
                    <span class="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                    <h3 class="font-semibold text-gray-800 flex-1">Load Source JSON(s)</h3>
                    <button id="qb-btn-load-github" class="gd-btn gd-btn-outline" onclick="figGitHubOpenPicker('quizbuilder')">
                        <i data-lucide="github" class="w-3.5 h-3.5"></i> Load from GitHub
                    </button>
                </div>
                <div id="qb-source-dropzone" class="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                    <input type="file" id="qb-source-files" accept=".json" multiple class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                    <i data-lucide="files" class="w-8 h-8 mx-auto text-gray-400 mb-2"></i>
                    <p class="text-sm text-gray-600 font-medium" id="qb-source-name">Click or drag one or more source JSONs here</p>
                    <p class="text-xs text-gray-400 mt-1">aimcq formatted JSON — multiple files allowed</p>
                </div>
                <div id="qb-source-badges" class="hidden flex flex-wrap gap-2"></div>
            </div>

            <!-- Step 2: Build -->
            <div id="qb-workspace" class="hidden space-y-4">
                <div class="flex items-center gap-3">
                    <span class="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                    <h3 class="font-semibold text-gray-800">Drag questions into your new quiz</h3>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    <!-- SOURCE column -->
                    <div class="bg-white border border-gray-200 rounded-xl flex flex-col" style="max-height:70vh">
                        <div class="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <h4 class="font-semibold text-gray-700 text-sm flex items-center gap-1.5">
                                    <i data-lucide="database" class="w-4 h-4 text-gray-500"></i> Source Questions
                                    <span id="qb-source-count" class="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-bold">0</span>
                                </h4>
                                <button id="qb-add-all" class="fb-mini-btn" style="color:#0d9488;background:#f0fdfa;border-color:#99f6e4">
                                    <i data-lucide="plus" class="w-3 h-3"></i> Add all shown
                                </button>
                            </div>
                            <div class="flex gap-2 flex-wrap">
                                <select id="qb-source-file-filter" class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white font-semibold text-gray-700 flex-1 min-w-[120px]">
                                    <option value="all">All source files</option>
                                </select>
                                <div class="relative flex-1 min-w-[120px]">
                                    <i data-lucide="search" class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    <input type="text" id="qb-source-search" placeholder="Search..." class="pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg w-full bg-white">
                                </div>
                            </div>
                        </div>
                        <div id="qb-source-list" class="overflow-y-auto custom-scrollbar p-2 space-y-1.5 flex-1">
                            <p class="text-center text-gray-400 text-sm py-8">Load a source file to see questions.</p>
                        </div>
                    </div>

                    <!-- NEW QUIZ column -->
                    <div class="bg-white border border-teal-200 rounded-xl flex flex-col" style="max-height:70vh">
                        <div class="px-4 py-3 border-b border-teal-100 bg-teal-50 rounded-t-xl">
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <h4 class="font-semibold text-teal-800 text-sm flex items-center gap-1.5">
                                    <i data-lucide="list-checks" class="w-4 h-4 text-teal-600"></i> New Quiz
                                    <span id="qb-new-count" class="text-xs bg-teal-200 text-teal-800 px-1.5 py-0.5 rounded-full font-bold">0</span>
                                </h4>
                                <button id="qb-clear-new" class="fb-mini-btn" style="color:#dc2626;background:#fef2f2;border-color:#fecaca">
                                    <i data-lucide="trash-2" class="w-3 h-3"></i> Clear
                                </button>
                            </div>
                            <p class="text-[11px] text-teal-600">Drag to reorder. Drag a source question here, or click its <b>+</b>.</p>
                        </div>
                        <div id="qb-new-list" class="overflow-y-auto custom-scrollbar p-2 space-y-1.5 flex-1">
                            <p id="qb-new-empty" class="text-center text-gray-400 text-sm py-8">
                                Your new quiz is empty — drag questions here from the left.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Step 3: Export -->
                <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                    <div class="flex items-center gap-3">
                        <span class="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                        <h3 class="font-semibold text-gray-800">Export the new quiz</h3>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="fb-label">Quiz file name</label>
                            <input type="text" id="qb-filename" class="fb-input" value="new-quiz.json">
                        </div>
                        <div>
                            <label class="fb-label">Quiz title <span class="text-gray-400">(stored in JSON)</span></label>
                            <input type="text" id="qb-quiz-title" class="fb-input" placeholder="My New Quiz">
                        </div>
                    </div>
                    <div class="flex gap-2 flex-wrap items-center">
                        <button id="qb-download" class="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-6 rounded-xl shadow transition-all">
                            <i data-lucide="download" class="w-5 h-5"></i> Download Quiz JSON
                        </button>
                        <button id="qb-upload-github" class="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 px-5 rounded-xl shadow transition-all">
                            <i data-lucide="github" class="w-5 h-5"></i> Upload to GitHub
                        </button>
                        <span id="qb-export-note" class="text-xs text-gray-500"></span>
                    </div>
                </div>
            </div>
        </div>
        <!-- end quiz builder tab -->

        <!-- ==================== EDITOR TAB ==================== -->
        <div id="tab-editor" class="hidden space-y-5">

            <!-- Step 1: Load Base JSON -->
            <div id="editor-step-upload" class="space-y-4">
                <div class="flex items-center gap-3 flex-wrap">
                    <span class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                    <h3 class="font-semibold text-gray-800 flex-1">Load Base JSON <span class="text-gray-400 font-normal text-sm">(the file you want to edit)</span></h3>
                    <button id="editor-btn-load-github" class="gd-btn gd-btn-outline" onclick="figGitHubOpenPicker('editor')">
                        <i data-lucide="github" class="w-3.5 h-3.5"></i> Load from GitHub
                    </button>
                </div>
                <div id="editor-base-dropzone" class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                    <input type="file" id="editor-base-file" accept=".json" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                    <i data-lucide="file-json" class="w-9 h-9 mx-auto text-gray-400 mb-2"></i>
                    <p class="text-sm text-gray-600 font-medium" id="editor-base-file-name">Click or drag Base JSON here</p>
                    <p class="text-xs text-gray-400 mt-1">aimcq formatted JSON — or load from GitHub</p>
                </div>
                <!-- GitHub link chip (shown when file was loaded from GitHub) -->
                <div id="editor-github-link-row" class="hidden items-center gap-2 flex-wrap">
                    <span class="gd-file-chip linked">
                        <i data-lucide="github" class="w-3 h-3"></i>
                        <span id="editor-github-link-name">Linked to GitHub file</span>
                        <code id="editor-github-link-path"></code>
                    </span>
                    <button class="gd-btn gd-btn-outline" onclick="editorCopyGitHubCdn()" title="Copy the jsDelivr CDN link for this JSON">
                        <i data-lucide="link" class="w-3.5 h-3.5"></i> Copy CDN link
                    </button>
                    <button class="gd-btn gd-btn-danger" onclick="editorUnlinkGitHub()" title="Unlink — saves will no longer commit to this GitHub file">
                        <i data-lucide="unlink" class="w-3.5 h-3.5"></i> Unlink
                    </button>
                </div>
            </div>

            <!-- Step 2: The Editor Workspace -->
            <div id="editor-workspace" class="hidden space-y-4">

                <!-- Stats bar -->
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div class="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                        <p class="text-2xl font-bold text-blue-700" id="editor-stat-total">0</p>
                        <p class="text-xs text-blue-500 mt-0.5">Base Questions</p>
                    </div>
                    <div class="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                        <p class="text-2xl font-bold text-red-600" id="editor-stat-selected">0</p>
                        <p class="text-xs text-red-400 mt-0.5">Marked to Delete</p>
                    </div>
                    <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                        <p class="text-2xl font-bold text-indigo-700" id="editor-stat-final">0</p>
                        <p class="text-xs text-indigo-400 mt-0.5">Final Count</p>
                    </div>
                </div>

                <!-- Toolbar / Actions -->
                <div class="sticky-editor-toolbar rounded-xl px-4 py-3 flex flex-wrap gap-2 items-center">
                    <!-- Search -->
                    <div class="relative flex-1 min-w-[180px]">
                        <i data-lucide="search" class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        <input type="text" id="editor-search" placeholder="Search questions..." class="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50">
                    </div>

                    <!-- Filter -->
                    <select id="editor-filter" class="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700">
                        <option value="all">All</option>
                        <option value="to-delete">To Delete</option>
                    </select>

                    <div class="flex gap-2 flex-wrap">
                        <!-- Expand / collapse all -->
                        <button id="btn-expand-all" title="Expand all visible cards" class="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold py-2 px-3 rounded-lg transition-colors flex items-center gap-1.5">
                            <i data-lucide="chevrons-down" class="w-3.5 h-3.5"></i> Expand
                        </button>
                        <button id="btn-collapse-all" title="Collapse all cards" class="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold py-2 px-3 rounded-lg transition-colors flex items-center gap-1.5">
                            <i data-lucide="chevrons-up" class="w-3.5 h-3.5"></i> Collapse
                        </button>
                        <!-- Default language for front view -->
                        <select id="editor-default-lang" title="Default display language" class="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
                            <option value="en">EN</option>
                            <option value="hi">हिं</option>
                        </select>
                        <!-- Select all base visible -->
                        <button id="btn-select-all-del" title="Select all visible base questions for deletion" class="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold py-2 px-3 rounded-lg transition-colors flex items-center gap-1.5">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Select All (Del)
                        </button>
                        <button id="btn-deselect-all-del" title="Clear all delete selections" class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 font-semibold py-2 px-3 rounded-lg transition-colors flex items-center gap-1.5">
                            <i data-lucide="x" class="w-3.5 h-3.5"></i> Clear Delete
                        </button>
                    </div>

                    <!-- Apply + Download -->
                    <button id="btn-apply-export" class="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 transition-colors shadow-sm">
                        <i data-lucide="download" class="w-4 h-4"></i> Apply & Export
                    </button>
                </div>

                <!-- Header Row -->
                <div class="flex items-center justify-between border-b border-gray-200 mt-1 pb-1">
                    <div class="flex">
                        <span id="view-tab-btn-base" class="view-tab-btn active">
                            <i data-lucide="database" class="w-3.5 h-3.5"></i>
                            Base Questions
                            <span id="view-tab-base-count" class="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold"></span>
                        </span>
                    </div>
                    <span id="live-update-badge" class="live-badge mr-1">
                        <span class="live-dot"></span> Live
                    </span>
                </div>

                <!-- BASE QUESTIONS PANEL -->
                <div id="view-panel-base">
                    <!-- Live JSON preview header -->
                    <div class="flex items-center justify-between mb-2 mt-1">
                        <p class="text-xs text-gray-500 font-medium">
                            Edit questions below. <span class="text-red-500 font-semibold">Check = mark for deletion.</span>
                        </p>
                        <button id="btn-toggle-live-preview" onclick="toggleLivePreview()" class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 border border-indigo-200 rounded-lg px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                            <i data-lucide="code-2" class="w-3 h-3"></i> <span id="live-preview-btn-label">Show Live JSON</span>
                        </button>
                    </div>

                    <!-- Live JSON Preview Box (collapsed by default) -->
                    <div id="live-json-preview-box" class="hidden mb-3">
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <i data-lucide="braces" class="w-3.5 h-3.5 text-indigo-400"></i> Live Base JSON Preview
                                <span class="live-badge"><span class="live-dot"></span> Auto-updates</span>
                            </span>
                            <span class="text-xs text-gray-400" id="live-json-meta"></span>
                        </div>
                        <div id="base-live-json-preview" class="custom-scrollbar"></div>
                    </div>

                    <div id="editor-question-list-base" class="space-y-2 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
                        <!-- Base question cards injected here -->
                    </div>
                    <p id="editor-empty-msg-base" class="hidden text-center text-gray-400 py-10 text-sm">No base questions match your search/filter.</p>
                </div>

                <!-- Hidden stub kept so legacy import code references resolve harmlessly -->
                <div id="view-panel-import" class="hidden">
                    <div id="editor-question-list-import"></div>
                    <p id="editor-empty-msg-import" class="hidden"></p>
                </div>

                <!-- Export Summary -->
                <div id="editor-export-result" class="hidden bg-indigo-50 border border-indigo-100 rounded-xl p-5 text-center mt-4">
                    <i data-lucide="check-circle-2" class="w-10 h-10 text-green-500 mx-auto mb-3"></i>
                    <h3 class="font-bold text-gray-800 mb-1">Export Ready!</h3>
                    <p class="text-sm text-gray-600 mb-4" id="editor-export-stats"></p>
                    <div class="flex items-center justify-center gap-3 flex-wrap">
                        <button id="btn-download-edited" class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl shadow transition-all">
                            <i data-lucide="download" class="w-5 h-5"></i> Download Edited JSON
                        </button>
                        <button id="btn-update-github" class="hidden inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 px-6 rounded-xl shadow transition-all">
                            <i data-lucide="github" class="w-5 h-5"></i>
                            <span id="btn-update-github-label">Update to GitHub</span>
                        </button>
                    </div>
                    <p id="editor-drive-update-hint" class="hidden text-xs text-gray-500 mt-2">
                        Will overwrite the linked GitHub file — the path stays the same.
                    </p>
                </div>

            </div>

            <!-- Prompt to load base file -->
            <div id="editor-prompt" class="py-12 text-center text-gray-400 text-sm">
                <i data-lucide="arrow-up-circle" class="w-10 h-10 mx-auto mb-3 text-gray-300"></i>
                Load a Base JSON above to start editing.
            </div>

        </div>
        <!-- end editor tab -->

        <!-- ==================== FIGURE UPDATER TAB ==================== -->
        <div id="tab-figures" class="hidden space-y-5">

            <!-- Intro -->
            <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                <i data-lucide="image-plus" class="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5"></i>
                <div class="text-sm text-indigo-900">
                    <p class="font-semibold mb-0.5">Manual Figure Updater</p>
                    <p class="text-indigo-700 text-xs leading-relaxed">
                        Crop figures from an exam PDF and assign them to questions — replacing
                        <code class="bg-indigo-100 px-1 rounded">[image here: ...]</code> placeholders or
                        existing figures. Crops are kept <b>locally</b> while you resize and preview;
                        clicking <b>Apply Figures to This Question</b> uploads them to your chosen
                        image host (<b>GitHub + jsDelivr</b>) and writes
                        them in. Finally, save the JSON.
                    </p>
                </div>
            </div>

            <!-- Step 1: Load JSON -->
            <div class="space-y-3">
                <div class="flex items-center gap-3 flex-wrap">
                    <span class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                    <h3 class="font-semibold text-gray-800 flex-1">Load Questions JSON</h3>
                    <button id="fig-btn-load-github" class="gd-btn gd-btn-outline" onclick="figGitHubOpenPicker()">
                        <i data-lucide="github" class="w-3.5 h-3.5"></i> Load from GitHub
                    </button>
                </div>
                <div id="fig-json-dropzone" class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                    <input type="file" id="fig-json-file" accept=".json" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                    <i data-lucide="file-json" class="w-9 h-9 mx-auto text-gray-400 mb-2"></i>
                    <p class="text-sm text-gray-600 font-medium" id="fig-json-name">Click or drag aimcq JSON here</p>
                    <p class="text-xs text-gray-400 mt-1">aimcq formatted JSON — or load from GitHub</p>
                </div>
                <div id="fig-github-link-row" class="hidden items-center gap-2 flex-wrap">
                    <span class="gd-file-chip linked">
                        <i data-lucide="github" class="w-3 h-3"></i>
                        <span id="fig-github-link-name">Linked to GitHub file</span>
                        <code id="fig-github-link-path"></code>
                    </span>
                    <button class="gd-btn gd-btn-outline" onclick="figCopyGitHubCdn()" title="Copy the jsDelivr CDN link for this JSON">
                        <i data-lucide="link" class="w-3.5 h-3.5"></i> Copy CDN link
                    </button>
                    <button class="gd-btn gd-btn-danger" onclick="figUnlinkGitHub()" title="Unlink — saves will no longer commit to this GitHub file">
                        <i data-lucide="unlink" class="w-3.5 h-3.5"></i> Unlink
                    </button>
                </div>
            </div>

            <!-- Image hosting (GitHub + jsDelivr) -->
            <div class="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
                <div class="flex items-center gap-2">
                    <i data-lucide="image-up" class="w-4 h-4 text-amber-600 flex-shrink-0"></i>
                    <h4 class="font-semibold text-amber-900 text-sm">Image Hosting — GitHub + jsDelivr</h4>
                </div>
                <p class="text-xs text-amber-700 leading-relaxed">
                    Cropped figures are committed to a GitHub repo and served via the
                    jsDelivr CDN — no rate limits, fast global delivery.
                </p>

                <!-- GitHub config -->
                <div id="fig-host-github" class="space-y-2.5">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label class="fig-cfg-label">Repository <span class="text-amber-500">(owner/repo)</span></label>
                            <input type="text" id="fig-gh-repo" placeholder="myname/mcq-images" class="gd-input w-full">
                        </div>
                        <div>
                            <label class="fig-cfg-label">Branch</label>
                            <input type="text" id="fig-gh-branch" placeholder="main" value="main" class="gd-input w-full">
                        </div>
                        <div>
                            <label class="fig-cfg-label">Folder path <span class="text-amber-500">(optional)</span></label>
                            <input type="text" id="fig-gh-path" placeholder="figures" class="gd-input w-full">
                        </div>
                        <div>
                            <label class="fig-cfg-label">
                                Personal Access Token
                                <a href="https://github.com/settings/tokens/new?scopes=public_repo&description=MCQ%20Figure%20Updater"
                                    target="_blank" class="gd-link text-[10px]">create one</a>
                            </label>
                            <input type="password" id="fig-gh-token" placeholder="ghp_..." class="gd-input w-full" autocomplete="off">
                        </div>
                    </div>
                    <div class="flex gap-2 flex-wrap items-center">
                        <button class="gd-btn gd-btn-outline" id="fig-gh-save">
                            <i data-lucide="check" class="w-3.5 h-3.5"></i> Save &amp; Verify
                        </button>
                        <button class="gd-btn gd-btn-danger" id="fig-gh-clear">
                            <i data-lucide="x" class="w-3.5 h-3.5"></i> Clear
                        </button>
                        <span class="text-[11px] text-amber-600">
                            Token needs <code>public_repo</code> (or <code>repo</code> for private) scope. Stored locally in this browser only.
                        </span>
                    </div>
                    <div id="fig-gh-status" class="text-xs text-amber-700"></div>
                </div>
            </div>

            <!-- Step 2: Upload PDF or Image -->
            <div id="fig-step-pdf" class="hidden space-y-3">
                <div class="flex items-center gap-3">
                    <span class="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                    <h3 class="font-semibold text-gray-800">Upload Exam PDF or Image <span class="text-gray-400 font-normal text-sm">(to crop figures from)</span></h3>
                </div>
                <div id="fig-source-pick" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div id="fig-pdf-upload" class="fig-upload-area" onclick="document.getElementById('fig-pdf-file').click()">
                        <input type="file" id="fig-pdf-file" accept="application/pdf" class="hidden">
                        <i data-lucide="file-up" class="w-9 h-9 mx-auto text-gray-400 mb-2"></i>
                        <p class="text-sm text-gray-700 font-semibold">Upload a PDF</p>
                        <p class="text-xs text-gray-400 mt-1">Rendered at high fidelity for accurate cropping</p>
                    </div>
                    <div id="fig-img-upload" class="fig-upload-area" onclick="document.getElementById('fig-img-file').click()">
                        <input type="file" id="fig-img-file" accept="image/*" class="hidden">
                        <i data-lucide="image-plus" class="w-9 h-9 mx-auto text-gray-400 mb-2"></i>
                        <p class="text-sm text-gray-700 font-semibold">Upload an image</p>
                        <p class="text-xs text-gray-400 mt-1">PNG, JPG, WEBP, GIF — crop any region</p>
                    </div>
                </div>
            </div>

            <!-- Step 3: Workspace -->
            <div id="fig-workspace" class="hidden space-y-5">

                <!-- PDF viewer + cropper -->
                <div class="fig-pdf-stage">
                    <div class="fig-page-nav">
                        <button type="button" class="fig-nav-btn" id="fig-prev-page">&laquo; Prev</button>
                        <span>Page <b id="fig-cur-page">1</b> / <b id="fig-total-pages">--</b></span>
                        <button type="button" class="fig-nav-btn" id="fig-next-page">Next &raquo;</button>
                        <span class="fig-nav-sep"></span>
                        <span class="ml-1">Zoom</span>
                        <button type="button" class="fig-nav-btn" id="fig-zoom-out" title="Zoom out">&minus;</button>
                        <input type="text" class="fig-zoom-input" id="fig-zoom-val" value="100%" readonly>
                        <button type="button" class="fig-nav-btn" id="fig-zoom-in" title="Zoom in">+</button>
                        <button type="button" class="fig-nav-btn" id="fig-zoom-reset" title="Reset zoom to fit">Fit</button>
                        <span class="fig-nav-sep"></span>
                        <button type="button" class="fig-nav-btn fig-crop-toggle" id="fig-crop-toggle"
                            title="Enable crop mode — then drag on the page to select an area">
                            <i data-lucide="crop" class="w-3.5 h-3.5"></i> <span id="fig-crop-toggle-label">Enable Crop</span>
                        </button>
                        <button type="button" class="fig-nav-btn" id="fig-pdf-change" title="Load a different PDF or image">Change File</button>
                    </div>
                    <div id="fig-pdf-scroll" class="fig-pdf-scroll">
                        <div id="fig-pdf-wrap" class="fig-pdf-wrap">
                            <canvas id="fig-pdf-canvas"></canvas>
                        </div>
                    </div>
                    <p class="fig-crop-hint" id="fig-crop-hint">
                        <i data-lucide="info" class="w-3 h-3"></i>
                        Crop mode is <b>off</b> — scroll and zoom freely. Click <b>Enable Crop</b> to select an area.
                    </p>
                </div>

                <!-- Quick crop & upload -->
                <div class="bg-sky-50 border border-sky-100 rounded-xl p-4">
                    <div class="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <h4 class="font-semibold text-sky-900 text-sm mb-0.5">Quick Crop &amp; Upload</h4>
                            <p class="text-xs text-sky-700">Crop any region and upload it to your chosen image host — get a reusable image URL.</p>
                        </div>
                        <button id="fig-quick-upload" class="gd-btn gd-btn-primary">
                            <i data-lucide="upload-cloud" class="w-3.5 h-3.5"></i> Crop &amp; Upload
                        </button>
                    </div>
                    <div id="fig-quick-result" class="hidden mt-3 text-xs"></div>
                </div>

                <!-- Question selector -->
                <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <div class="flex items-center justify-between gap-3 flex-wrap">
                        <h4 class="font-semibold text-gray-800 text-sm">Questions Needing Figures</h4>
                        <div class="flex items-center gap-2 flex-wrap">
                            <select id="fig-topic-filter" class="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                <option value="">All topics</option>
                            </select>
                            <label class="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                <input type="checkbox" id="fig-reupdate-mode" class="w-3.5 h-3.5 accent-indigo-600">
                                Re-update mode (show all)
                            </label>
                        </div>
                    </div>
                    <div class="relative">
                        <i data-lucide="search" class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        <input type="text" id="fig-q-search" placeholder="Filter questions..." class="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                    </div>
                    <div id="fig-q-list" class="max-h-72 overflow-y-auto custom-scrollbar pr-1">
                        <div class="py-8 text-center text-gray-400 text-sm">Load a JSON to see questions.</div>
                    </div>
                </div>

                <!-- Selected question editor -->
                <div id="fig-q-editor" class="hidden space-y-4">
                    <div class="flex items-center gap-2">
                        <span class="fig-q-badge" id="fig-sel-badge">Q #1</span>
                        <span class="text-sm font-semibold text-gray-700" id="fig-sel-title">Question</span>
                    </div>

                    <!-- Figure slots -->
                    <div class="fig-slots-grid" id="fig-slots-grid"></div>

                    <!-- Live preview -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                                <i data-lucide="eye" class="w-4 h-4 text-indigo-600"></i> Question Preview
                            </h4>
                            <div class="flex gap-1">
                                <button type="button" class="fig-nav-btn" id="fig-prev-lang-en" style="background:#e0e7ff;color:#4338ca;border-color:#c7d2fe">EN</button>
                                <button type="button" class="fig-nav-btn" id="fig-prev-lang-hi" style="background:#fff;color:#64748b;border-color:#e5e7eb">हिं</button>
                            </div>
                        </div>
                        <div class="fig-preview-box" id="fig-preview-box">
                            <em class="text-gray-400 text-sm">Select a question to preview.</em>
                        </div>
                    </div>

                    <!-- Apply -->
                    <div>
                        <button id="fig-apply-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm">
                            <i data-lucide="upload-cloud" class="w-4 h-4"></i> Apply Figures to This Question
                        </button>
                        <p class="text-xs text-gray-400 mt-1.5 text-center">
                            Uploads any newly-cropped figures to GitHub + jsDelivr, then writes them into the question.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Step 4: Save -->
            <div id="fig-step-save" class="hidden space-y-3">
                <div class="flex items-center gap-3">
                    <span class="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                    <h3 class="font-semibold text-gray-800">Save Updated JSON</h3>
                </div>
                <div class="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
                    <div class="text-sm text-gray-600 flex-1 min-w-[180px]">
                        <span id="fig-applied-count" class="font-bold text-indigo-600">0</span> question(s) updated in this session.
                    </div>
                    <button id="fig-download-btn" class="gd-btn gd-btn-outline">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i> Download JSON
                    </button>
                    <button id="fig-update-github-btn" class="gd-btn gd-btn-success hidden">
                        <i data-lucide="github" class="w-3.5 h-3.5"></i> <span id="fig-update-github-label">Update to GitHub</span>
                    </button>
                </div>
            </div>

        </div>
        <!-- end figure updater tab -->

        <!-- ==================== FRONTEND BUILDER TAB ==================== -->
        <div id="tab-builder" class="hidden space-y-5">

            <!-- Intro -->
            <div class="bg-violet-50 border border-violet-100 rounded-xl p-4 flex items-start gap-3">
                <i data-lucide="layout-template" class="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5"></i>
                <div class="text-sm text-violet-900">
                    <p class="font-semibold mb-0.5">Frontend Builder</p>
                    <p class="text-violet-700 text-xs leading-relaxed">
                        Visually configure an AI MCQs quiz embed — pick an embedding method,
                        choose the <b>basic</b> or <b>professional</b> exam interface, tune every
                        setting, then copy ready-to-paste code for your website.
                    </p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

                <!-- ============ LEFT: VISUAL BUILDER ============ -->
                <div class="space-y-4">

                    <!-- Step A: Method -->
                    <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                        <h3 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">A</span>
                            Embedding Method
                        </h3>
                        <div class="grid grid-cols-1 gap-2" id="fb-method-cards">
                            <label class="fb-method-card active" data-method="1">
                                <input type="radio" name="fb-method" value="1" checked class="sr-only">
                                <div class="fb-method-head">
                                    <i data-lucide="code" class="w-4 h-4"></i>
                                    <span class="fb-method-title">Method 1 — Inline JSON</span>
                                </div>
                                <p class="fb-method-desc">Quiz JSON pasted directly into the page. Self-contained, no external file.</p>
                            </label>
                            <label class="fb-method-card" data-method="2">
                                <input type="radio" name="fb-method" value="2" class="sr-only">
                                <div class="fb-method-head">
                                    <i data-lucide="link" class="w-4 h-4"></i>
                                    <span class="fb-method-title">Method 2 — Single JSON URL</span>
                                </div>
                                <p class="fb-method-desc">One quiz file loaded from a jsDelivr / CDN URL.</p>
                            </label>
                            <label class="fb-method-card" data-method="3">
                                <input type="radio" name="fb-method" value="3" class="sr-only">
                                <div class="fb-method-head">
                                    <i data-lucide="layers" class="w-4 h-4"></i>
                                    <span class="fb-method-title">Method 3 — Multiple JSON files</span>
                                </div>
                                <p class="fb-method-desc">Several files merged into one quiz with topic tabs &amp; section headings.</p>
                            </label>
                        </div>
                    </div>

                    <!-- Step B: Source -->
                    <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                        <h3 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">B</span>
                            <span id="fb-source-title">Quiz Source</span>
                        </h3>

                        <!-- Method 1: inline JSON -->
                        <div id="fb-source-inline" class="space-y-2">
                            <label class="fb-label">Quiz JSON <span class="text-gray-400">(paste, or load from a tab)</span></label>
                            <textarea id="fb-inline-json" rows="4" placeholder='{ "version": "5", "posts": [ ... ] }'
                                class="fb-input font-mono text-xs" style="resize:vertical"></textarea>
                            <div class="flex gap-2 flex-wrap">
                                <button type="button" class="fb-mini-btn" id="fb-inline-use-editor">Use Editor JSON</button>
                                <button type="button" class="fb-mini-btn" id="fb-inline-use-figures">Use Figure Updater JSON</button>
                                <button type="button" class="fb-mini-btn" id="fb-inline-format">Format</button>
                            </div>
                            <p id="fb-inline-status" class="text-[11px] text-gray-400"></p>
                        </div>

                        <!-- Method 2: single URL -->
                        <div id="fb-source-single" class="space-y-2 hidden">
                            <label class="fb-label">JSON URL</label>
                            <input type="text" id="fb-single-url" class="fb-input"
                                placeholder="https://cdn.jsdelivr.net/gh/USER/REPO@TAG/quiz.json">
                            <p class="text-[11px] text-gray-400">Any public URL — jsDelivr, raw GitHub, your own server.</p>
                        </div>

                        <!-- Method 3: multiple URLs -->
                        <div id="fb-source-multi" class="space-y-2 hidden">
                            <label class="fb-label">Chapter / topic files</label>
                            <div id="fb-multi-rows" class="space-y-2"></div>
                            <button type="button" class="fb-mini-btn" id="fb-multi-add">
                                <i data-lucide="plus" class="w-3 h-3"></i> Add file
                            </button>
                            <label class="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer mt-1">
                                <input type="checkbox" id="fb-multi-order" class="w-3.5 h-3.5 accent-violet-600" checked>
                                Force section order to match the list above (<code>topic_order</code>)
                            </label>
                        </div>
                    </div>

                    <!-- Step C: Interface -->
                    <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                        <h3 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">C</span>
                            Exam Interface
                        </h3>
                        <div class="grid grid-cols-2 gap-2">
                            <label class="fb-iface-card active" data-iface="basic">
                                <input type="radio" name="fb-iface" value="basic" checked class="sr-only">
                                <i data-lucide="square" class="w-5 h-5"></i>
                                <span class="fb-iface-title">Basic</span>
                                <span class="fb-iface-desc">Lightweight in-page quiz</span>
                            </label>
                            <label class="fb-iface-card" data-iface="professional">
                                <input type="radio" name="fb-iface" value="professional" class="sr-only">
                                <i data-lucide="monitor" class="w-5 h-5"></i>
                                <span class="fb-iface-title">Professional</span>
                                <span class="fb-iface-desc">Full-screen SSC-style CBT</span>
                            </label>
                        </div>
                    </div>

                    <!-- Step D: Settings -->
                    <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                        <h3 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">D</span>
                            Quiz Settings
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="sm:col-span-2">
                                <label class="fb-label">Container ID</label>
                                <input type="text" id="fb-container-id" class="fb-input" value="aimcq-quiz-1">
                            </div>
                            <div class="sm:col-span-2">
                                <label class="fb-label">Quiz title</label>
                                <input type="text" id="fb-title" class="fb-input" value="My Quiz Title">
                            </div>
                            <div class="sm:col-span-2">
                                <label class="fb-label">Description <span class="text-gray-400">(start screen)</span></label>
                                <input type="text" id="fb-description" class="fb-input"
                                    value="Short description shown on the start screen">
                            </div>
                            <div>
                                <label class="fb-label">Timer (minutes)</label>
                                <input type="number" id="fb-timer" class="fb-input" value="10" min="0">
                            </div>
                            <div>
                                <label class="fb-label">Questions in quiz <span class="text-gray-400">(0 = all)</span></label>
                                <input type="number" id="fb-quiz-questions" class="fb-input" value="10" min="0">
                            </div>
                            <div>
                                <label class="fb-label">Reload after N answered <span class="text-gray-400">(0 = off)</span></label>
                                <input type="number" id="fb-reload-after" class="fb-input" value="0" min="0">
                            </div>
                            <div>
                                <label class="fb-label">Display mode</label>
                                <select id="fb-display-mode" class="fb-input">
                                    <option value="single">Single question</option>
                                    <option value="all">All on one page</option>
                                </select>
                            </div>
                            <div>
                                <label class="fb-label">Feedback mode</label>
                                <select id="fb-feedback-mode" class="fb-input">
                                    <option value="end_of_exam">At end of exam</option>
                                    <option value="instant">Instant (revision)</option>
                                </select>
                            </div>
                            <div class="fb-pro-only">
                                <label class="fb-label">Marks per question</label>
                                <input type="number" id="fb-marks" class="fb-input" value="1" min="0" step="0.25">
                            </div>
                            <div class="fb-pro-only">
                                <label class="fb-label">Negative marks</label>
                                <input type="number" id="fb-negative" class="fb-input" value="0" min="0" step="0.25">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            <label class="fb-check"><input type="checkbox" id="fb-shuffle-q" checked> Shuffle questions</label>
                            <label class="fb-check"><input type="checkbox" id="fb-shuffle-o" checked> Shuffle options</label>
                            <label class="fb-check"><input type="checkbox" id="fb-show-explanation" checked> Show explanations</label>
                        </div>
                        <p class="fb-pro-note text-[11px] text-violet-600 bg-violet-50 rounded-lg p-2 hidden">
                            <i data-lucide="info" class="w-3 h-3 inline"></i>
                            Marks &amp; negative marks apply only to the professional interface in exam mode.
                        </p>
                    </div>

                    <!-- Step E: Head block -->
                    <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                        <h3 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">E</span>
                            Engine Source <span class="text-gray-400 font-normal text-xs">(for the head block)</span>
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="fb-label">GitHub user/repo</label>
                                <input type="text" id="fb-engine-repo" class="fb-input" value="YOUR-USER/aimcq-engine">
                            </div>
                            <div>
                                <label class="fb-label">Version tag</label>
                                <input type="text" id="fb-engine-tag" class="fb-input" value="2.0.0">
                            </div>
                        </div>
                        <label class="fb-check"><input type="checkbox" id="fb-include-head" checked> Include the head block in the output</label>
                    </div>
                </div>

                <!-- ============ RIGHT: GENERATED CODE ============ -->
                <div class="space-y-4 lg:sticky lg:top-4 self-start">
                    <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                            <h3 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                <i data-lucide="file-code-2" class="w-4 h-4 text-violet-600"></i> Generated Code
                            </h3>
                            <div class="flex gap-1.5">
                                <button type="button" class="fb-copy-btn" id="fb-copy-head">
                                    <i data-lucide="copy" class="w-3.5 h-3.5"></i> Head
                                </button>
                                <button type="button" class="fb-copy-btn primary" id="fb-copy-quiz">
                                    <i data-lucide="copy" class="w-3.5 h-3.5"></i> Quiz block
                                </button>
                                <button type="button" class="fb-copy-btn" id="fb-copy-all">
                                    <i data-lucide="copy" class="w-3.5 h-3.5"></i> All
                                </button>
                            </div>
                        </div>
                        <pre id="fb-code-output" class="fb-code"><code>Configure the options to generate code…</code></pre>
                    </div>
                    <div class="bg-violet-50 border border-violet-100 rounded-xl p-3 text-[11px] text-violet-700 leading-relaxed">
                        <i data-lucide="lightbulb" class="w-3.5 h-3.5 inline text-violet-500"></i>
                        Paste the <b>head block</b> once per site (in <code>&lt;head&gt;</code> or before
                        <code>&lt;/body&gt;</code>). Paste the <b>quiz block</b> wherever a quiz should appear.
                        Each quiz block needs a unique container ID.
                    </div>
                </div>
            </div>
        </div>
        <!-- end frontend builder tab -->

    </div>
</div>

<!-- ===== Question Editor Modal ===== -->
<div id="q-editor-modal" class="hidden">
    <div id="q-editor-backdrop" onclick="closeQEditor()"></div>
    <div id="q-editor-panel" class="custom-scrollbar">

        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-[18px]">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="pencil" class="w-4.5 h-4.5 text-indigo-600"></i>
                </div>
                <div>
                    <h2 class="font-bold text-gray-900 text-base">Edit Question</h2>
                    <p class="text-xs text-gray-400" id="qe-q-number">#1</p>
                </div>
            </div>
            <button onclick="closeQEditor()" class="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>

        <!-- Language Tabs -->
        <div class="flex border-b border-gray-100 px-4">
            <button id="qe-tab-en" class="q-editor-lang-tab active" onclick="switchQEditorLang('en')">
                🇬🇧 English
            </button>
            <button id="qe-tab-hi" class="q-editor-lang-tab" onclick="switchQEditorLang('hi')">
                🇮🇳 हिन्दी
            </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-5">

            <!-- ENGLISH PANEL -->
            <div id="qe-panel-en">
                <div class="mb-4">
                    <p class="q-editor-section-label">Question (English)</p>
                    <div class="rich-editor-wrap" data-field="en-question"></div>
                </div>

                <div>
                    <div class="flex items-center justify-between mb-2">
                        <p class="q-editor-section-label">Options (English)</p>
                        <span class="text-xs text-gray-400 flex items-center gap-1">
                            <i data-lucide="check-circle" class="w-3 h-3 text-emerald-500"></i>
                            Radio = correct answer
                        </span>
                    </div>
                    <div id="qe-en-options" class="space-y-2"></div>
                </div>

                <div class="mt-4">
                    <p class="q-editor-section-label">Explanation (English)</p>
                    <div class="rich-editor-wrap" data-field="en-explanation"></div>
                </div>
            </div>

            <!-- HINDI PANEL -->
            <div id="qe-panel-hi" class="hidden">
                <div class="mb-4">
                    <p class="q-editor-section-label">प्रश्न (हिन्दी)</p>
                    <div class="rich-editor-wrap" data-field="hi-question" data-lang="hi"></div>
                </div>

                <div>
                    <div class="flex items-center justify-between mb-2">
                        <p class="q-editor-section-label">विकल्प (हिन्दी)</p>
                        <span class="text-xs text-gray-400 flex items-center gap-1">
                            <i data-lucide="check-circle" class="w-3 h-3 text-emerald-500"></i>
                            सही उत्तर — Radio से चुनें
                        </span>
                    </div>
                    <div id="qe-hi-options" class="space-y-2"></div>
                </div>

                <div class="mt-4">
                    <p class="q-editor-section-label">व्याख्या (हिन्दी)</p>
                    <div class="rich-editor-wrap" data-field="hi-explanation" data-lang="hi"></div>
                </div>
            </div>

        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-[18px]">
            <div class="flex items-center gap-2 text-xs text-gray-400">
                <i data-lucide="info" class="w-3.5 h-3.5"></i>
                Changes apply immediately to base data.
            </div>
            <div class="flex gap-2">
                <button onclick="closeQEditor()" class="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    Cancel
                </button>
                <button onclick="saveQEditor()" class="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                    <i data-lucide="save" class="w-4 h-4"></i> Save Changes
                </button>
            </div>
        </div>

    </div>
</div>

<!-- ===== GitHub File Picker Modal (tabbed) ===== -->
<div id="fig-gh-picker-modal" class="gd-modal hidden">
    <div class="gd-modal-backdrop" onclick="figGitHubClosePicker()"></div>
    <div class="gd-modal-panel">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div class="flex items-center gap-2">
                <i data-lucide="github" class="w-5 h-5 text-gray-800"></i>
                <h3 class="font-bold text-gray-800" id="fig-gh-picker-title">GitHub — JSON files</h3>
            </div>
            <button onclick="figGitHubClosePicker()" class="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <i data-lucide="x" class="w-4 h-4 text-gray-500"></i>
            </button>
        </div>

        <!-- Tab bar -->
        <div class="flex border-b border-gray-100 bg-gray-50 px-3">
            <button class="ghtab active" data-ghtab="browse" onclick="ghSwitchTab('browse')">
                <i data-lucide="folder-open" class="w-3.5 h-3.5"></i> Browse &amp; Load
            </button>
            <button class="ghtab" data-ghtab="upload" onclick="ghSwitchTab('upload')">
                <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload New File
            </button>
            <button class="ghtab" data-ghtab="delete" onclick="ghSwitchTab('delete')">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete
            </button>
            <button class="ghtab" data-ghtab="creds" onclick="ghSwitchTab('creds')">
                <i data-lucide="key-round" class="w-3.5 h-3.5"></i> Credentials
            </button>
        </div>

        <!-- ========== TAB: Browse & Load ========== -->
        <div id="ghtab-browse" class="ghtab-panel">
            <div id="fig-gh-browse-norepo" class="hidden mx-5 mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <i data-lucide="alert-triangle" class="w-3.5 h-3.5 inline mr-1"></i>
                Set your repository and token in the <b>Credentials</b> tab first.
            </div>

            <!-- Recents (mentions) -->
            <div id="fig-gh-recents-wrap" class="hidden px-5 pt-3">
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                        <i data-lucide="at-sign" class="w-3 h-3 inline mr-1"></i> Recent files
                    </span>
                    <button class="text-[11px] text-gray-400 hover:text-red-500 font-semibold" onclick="ghClearRecents()">Clear</button>
                </div>
                <div id="fig-gh-recents" class="flex flex-wrap gap-1.5"></div>
            </div>

            <!-- Browse controls -->
            <div class="px-5 py-3 space-y-2">
                <div class="flex gap-2 flex-wrap items-center">
                    <input type="text" id="fig-gh-pick-path" placeholder="Folder path to browse, e.g. quizzes (blank = repo root)"
                        class="gd-input flex-1 min-w-[200px]">
                    <button class="gd-btn gd-btn-primary" onclick="figGitHubBrowse()">
                        <i data-lucide="folder-open" class="w-3.5 h-3.5"></i> Browse
                    </button>
                </div>
                <div class="flex items-center gap-2 my-0.5">
                    <div class="h-px bg-gray-200 flex-1"></div>
                    <span class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">or load a file directly</span>
                    <div class="h-px bg-gray-200 flex-1"></div>
                </div>
                <div class="flex gap-2 flex-wrap items-center">
                    <input type="text" id="fig-gh-pick-file" placeholder="Exact file path, e.g. quizzes/physics.json"
                        class="gd-input flex-1 min-w-[200px]">
                    <button class="gd-btn gd-btn-outline" onclick="figGitHubLoadByPath()">
                        <i data-lucide="arrow-right-circle" class="w-3.5 h-3.5"></i> Load
                    </button>
                </div>
            </div>
            <!-- Directory listing -->
            <div class="px-5 py-2 bg-white border-y border-gray-100">
                <span class="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                    <i data-lucide="folder" class="w-3 h-3 inline mr-1"></i>
                    <span id="fig-gh-picker-loc">Repository contents</span>
                </span>
            </div>
            <div id="fig-gh-picker-list" class="overflow-y-auto custom-scrollbar" style="max-height: 38vh;">
                <div class="p-8 text-center text-gray-400 text-sm">
                    Enter a folder and click <b>Browse</b> to list its JSON files.
                </div>
            </div>
        </div>

        <!-- ========== TAB: Upload New File ========== -->
        <div id="ghtab-upload" class="ghtab-panel hidden">
            <div id="fig-gh-upload-norepo" class="hidden mx-5 mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <i data-lucide="alert-triangle" class="w-3.5 h-3.5 inline mr-1"></i>
                Set your repository and token in the <b>Credentials</b> tab first.
            </div>
            <div class="px-5 py-4 space-y-3">
                <p class="text-xs text-gray-500 leading-relaxed">
                    Commit a new JSON file into the repository — into an existing folder
                    or a brand-new one (the folder is created automatically). Use this to
                    publish a quiz file, then load it from the Browse tab.
                </p>

                <!-- Pick the JSON to upload -->
                <div>
                    <label class="fig-cfg-label" style="color:#475569">JSON file to upload</label>
                    <div id="fig-gh-up-dropzone" class="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                        <input type="file" id="fig-gh-up-file" accept=".json" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                        <i data-lucide="file-json" class="w-8 h-8 mx-auto text-gray-400 mb-1.5"></i>
                        <p class="text-sm text-gray-600 font-medium" id="fig-gh-up-filename">Click or drag a .json file here</p>
                        <p class="text-xs text-gray-400 mt-0.5">or use the JSON currently loaded in this tool</p>
                    </div>
                    <button class="text-[11px] text-blue-600 font-semibold hover:text-blue-800 mt-1.5"
                        id="fig-gh-up-usecurrent" type="button">
                        <i data-lucide="copy-plus" class="w-3 h-3 inline"></i> Use the JSON currently loaded here
                    </button>
                </div>

                <!-- Destination folder + file name -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <label class="fig-cfg-label" style="color:#475569">Destination folder <span class="text-gray-400">(blank = repo root)</span></label>
                        <input type="text" id="fig-gh-up-folder" placeholder="e.g. quizzes/physics — new folders are created"
                            class="gd-input w-full">
                    </div>
                    <div>
                        <label class="fig-cfg-label" style="color:#475569">File name</label>
                        <input type="text" id="fig-gh-up-name" placeholder="my-quiz.json" class="gd-input w-full">
                    </div>
                </div>
                <label class="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                    <input type="checkbox" id="fig-gh-up-loadafter" class="w-3.5 h-3.5 accent-gray-700" checked>
                    Load this file into the tool after uploading
                </label>

                <button class="gd-btn gd-btn-success w-full justify-center" id="fig-gh-up-submit">
                    <i data-lucide="upload-cloud" class="w-3.5 h-3.5"></i> Upload to GitHub
                </button>
                <div id="fig-gh-up-status" class="text-xs"></div>
            </div>
        </div>

        <!-- ========== TAB: Delete File / Folder ========== -->
        <div id="ghtab-delete" class="ghtab-panel hidden">
            <div id="fig-gh-delete-norepo" class="hidden mx-5 mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <i data-lucide="alert-triangle" class="w-3.5 h-3.5 inline mr-1"></i>
                Set your repository and token in the <b>Credentials</b> tab first.
            </div>
            <div class="px-5 py-4 space-y-3">
                <p class="text-xs text-gray-500 leading-relaxed">
                    Browse the repository, then click the <b>Delete</b> button on any file or folder.
                    Deleting a folder removes <em>all files inside it</em> (recursively) — this cannot be undone.
                </p>

                <!-- Browse controls (mirrored from Browse tab) -->
                <div class="flex gap-2 flex-wrap items-center">
                    <input type="text" id="fig-gh-del-path" placeholder="Folder path to browse (blank = repo root)"
                        class="gd-input flex-1 min-w-[200px]">
                    <button class="gd-btn gd-btn-outline" onclick="ghDeleteBrowse()">
                        <i data-lucide="folder-open" class="w-3.5 h-3.5"></i> Browse
                    </button>
                </div>
                <div class="flex items-center gap-2 my-0.5">
                    <div class="h-px bg-gray-200 flex-1"></div>
                    <span class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">or enter an exact path</span>
                    <div class="h-px bg-gray-200 flex-1"></div>
                </div>
                <div class="flex gap-2 flex-wrap items-center">
                    <input type="text" id="fig-gh-del-exact" placeholder="Exact file or folder path, e.g. quizzes/physics.json"
                        class="gd-input flex-1 min-w-[200px]">
                    <button class="gd-btn gd-btn-danger" onclick="ghDeleteByExactPath()">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete
                    </button>
                </div>

                <!-- Directory listing for the delete tab -->
                <div class="bg-white border border-gray-100 rounded-xl overflow-hidden">
                    <div class="px-3 py-2 border-b border-gray-100 bg-gray-50 text-[11px] font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                        <i data-lucide="folder" class="w-3 h-3"></i>
                        <span id="fig-gh-del-loc">Repository contents</span>
                    </div>
                    <div id="fig-gh-del-list" class="overflow-y-auto custom-scrollbar" style="max-height:34vh;">
                        <div class="p-8 text-center text-gray-400 text-sm">
                            Enter a folder and click <b>Browse</b> to list contents.
                        </div>
                    </div>
                </div>

                <div id="fig-gh-del-status" class="text-xs"></div>

                <!-- Confirm delete dialog (inline, shown on demand) -->
                <div id="fig-gh-del-confirm" class="hidden bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                    <div class="flex items-start gap-2">
                        <i data-lucide="alert-triangle" class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"></i>
                        <div>
                            <p class="text-sm font-bold text-red-700">Confirm deletion</p>
                            <p class="text-xs text-red-600 mt-0.5" id="fig-gh-del-confirm-msg">
                                Are you sure you want to delete this?
                            </p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="gd-btn gd-btn-danger flex-1 justify-center" id="fig-gh-del-confirm-btn">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Yes, Delete
                        </button>
                        <button class="gd-btn gd-btn-outline" onclick="ghDeleteCancelConfirm()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ========== TAB: Credentials ========== -->
        <div id="ghtab-creds" class="ghtab-panel hidden">
            <div class="px-5 py-4 space-y-3">
                <div class="flex items-center gap-2 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                    <i data-lucide="key-round" class="w-3.5 h-3.5"></i> GitHub account for JSON files
                    <span class="font-normal lowercase tracking-normal text-gray-400">— independent of image hosting</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <label class="fig-cfg-label" style="color:#475569">Repository (owner/repo)</label>
                        <input type="text" id="fig-gh-pick-repo" placeholder="myname/mcq-quizzes" class="gd-input w-full">
                    </div>
                    <div>
                        <label class="fig-cfg-label" style="color:#475569">Branch</label>
                        <input type="text" id="fig-gh-pick-branch" placeholder="main" value="main" class="gd-input w-full">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="fig-cfg-label" style="color:#475569">
                            Personal Access Token
                            <a href="https://github.com/settings/tokens/new?scopes=repo&description=MCQ%20JSON%20Sync"
                                target="_blank" class="gd-link text-[10px]">create one</a>
                            <span class="font-normal text-gray-400 text-[10px]">— needs <code>repo</code> scope to read &amp; commit</span>
                        </label>
                        <input type="password" id="fig-gh-pick-token" placeholder="ghp_... (separate from the image-hosting token)"
                            class="gd-input w-full" autocomplete="off">
                    </div>
                </div>
                <div class="flex gap-2 flex-wrap items-center">
                    <label class="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                        <input type="checkbox" id="fig-gh-pick-remember" class="w-3.5 h-3.5 accent-gray-700" checked>
                        Remember these credentials in this browser
                    </label>
                    <button class="gd-btn gd-btn-outline" id="fig-gh-pick-verify" type="button">
                        <i data-lucide="check" class="w-3.5 h-3.5"></i> Save &amp; Verify
                    </button>
                    <button class="gd-btn gd-btn-danger" id="fig-gh-pick-forget" type="button">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Forget
                    </button>
                </div>
                <div id="fig-gh-creds-status" class="text-xs text-gray-500"></div>
            </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-500">
            <i data-lucide="info" class="w-3 h-3 inline mr-1"></i>
            <span id="fig-gh-footer-hint">Files load via the GitHub API. The <b>CDN</b> button copies a file's jsDelivr link.</span>
        </div>
    </div>
</div>

<!-- Toast Notification -->
<div id="toast" class="fixed bottom-4 right-4 max-w-sm w-full bg-gray-900 text-white rounded-xl shadow-2xl p-4 transform translate-y-20 opacity-0 transition-all duration-300 z-50 flex items-start gap-3 pointer-events-none">
    <i id="toast-icon" data-lucide="info" class="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-400"></i>
    <div>
        <h4 id="toast-title" class="font-bold text-sm">Notification</h4>
        <p id="toast-msg" class="text-sm text-gray-300 mt-0.5">Message goes here</p>
    </div>
</div>

`;

/* ---- third-party stylesheets (same versions as the standalone tool) ---- */
var CSS_DEPS = [
  ['https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css', 'katex'],
  ['https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css', 'cropper']
];

function ensureCSS(href, mark, cb){
  var links = document.getElementsByTagName('link'), i;
  for(i=0;i<links.length;i++){
    if((links[i].href||'').indexOf(href) > -1){
      // Already present — still resolve cb once it's loaded (or right away if it is).
      if(cb){
        var ln = links[i];
        if(ln.sheet){ cb(); }
        else { ln.addEventListener('load', cb); ln.addEventListener('error', cb); }
      }
      return;
    }
  }
  var l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  if(mark) l.setAttribute('data-mcqs-css', mark);
  if(cb){ l.addEventListener('load', cb); l.addEventListener('error', cb); }
  document.head.appendChild(l);
}

// Synchronously inject a tiny guard stylesheet that hides the tool until its
// real styles (mcqs.css + Tailwind) are ready. This <style> does NOT depend on
// any external file, so the "hidden" state applies before the first paint and
// the user never sees a flash of unstyled markup (FOUC). Reserving min-height
// + background also prevents a layout jump while the host is empty.
function injectGuardStyle(){
  if(document.getElementById('mcqs-guard-style')) return;
  var st = document.createElement('style');
  st.id = 'mcqs-guard-style';
  st.textContent =
    '.mcqs-embed{min-height:480px;background-color:#f3f4f6;}' +
    '.mcqs-embed .mcqs-app-root{opacity:0;}' +
    '.mcqs-embed.mcqs-ready .mcqs-app-root{opacity:1;transition:opacity .18s ease;}';
  (document.head || document.documentElement).appendChild(st);
}

function loadScript(src, opts){
  opts = opts || {};
  return new Promise(function(resolve){
    var ex = document.querySelector('script[data-mcqs-src="' + src + '"]');
    if(ex){
      if(ex.getAttribute('data-mcqs-done')) return resolve();
      ex.addEventListener('load', function(){ resolve(); });
      ex.addEventListener('error', function(){ resolve(); });
      return;
    }
    var s = document.createElement('script');
    s.src = src;
    s.async = false;                       // preserve execution order
    s.setAttribute('data-mcqs-src', src);
    s.onload = function(){
      s.setAttribute('data-mcqs-done', '1');
      if(opts.onload){ try{ opts.onload(); }catch(e){} }
      resolve();
    };
    s.onerror = function(){
      if(opts.fallback){
        var f = document.createElement('script');
        f.src = opts.fallback;
        f.async = false;
        f.setAttribute('data-mcqs-src', src);
        f.onload = function(){
          f.setAttribute('data-mcqs-done', '1');
          if(opts.onload){ try{ opts.onload(); }catch(e){} }
          resolve();
        };
        f.onerror = function(){ resolve(); };
        document.head.appendChild(f);
      } else {
        resolve();                         // never block; the app guards missing libs
      }
    };
    document.head.appendChild(s);
  });
}

function loadDeps(){
  // Stylesheets — order irrelevant.
  CSS_DEPS.forEach(function(d){ ensureCSS(d[0], d[1]); });

  // Independent libraries load in parallel; KaTeX core precedes auto-render.
  return Promise.all([
    loadScript('https://cdn.tailwindcss.com'),
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'),
    loadScript('https://cdn.jsdelivr.net/npm/lucide@0.460.0/dist/umd/lucide.min.js',
               { fallback:'https://cdnjs.cloudflare.com/ajax/libs/lucide/0.460.0/lucide.min.js' }),
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'),
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js'),
    loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js').then(function(){
      return loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js',
                        { onload:function(){ window._katexReady = true; } });
    })
  ]);
}

function applyHeight(host){
  var h = host.getAttribute('data-height');
  if(!h) return;                           // no data-height -> grows with content (min-height in CSS)
  if(/^[0-9]+$/.test(h)) h = h + 'px';     // bare number -> px
  host.style.height = h;                   // e.g. "100vh", "640px", "80vh"
}

function findHost(){
  return document.getElementById('smartboard-host')
      || document.querySelector('.smartboard-page-wrap [data-height]')
      || document.querySelector('.smartboard-page-wrap > div')
      || document.querySelector('[data-mcqs]')
      || document.querySelector('.mcqs-embed');
}

var booted = false;
function mount(){
  if(booted) return;
  var host = findHost();
  if(!host) return;                        // host not in the DOM yet
  if(host.getAttribute('data-mcqs-mounted')) { booted = true; return; }
  booted = true;

  host.setAttribute('data-mcqs-mounted', '1');
  host.classList.add('mcqs-embed');
  applyHeight(host);

  // Hide the tool until its styles are ready so there is no flash of unstyled
  // markup. The guard <style> is injected synchronously (before innerHTML), so
  // the hidden state is in effect before the browser paints anything.
  injectGuardStyle();

  var revealed = false;
  function reveal(){
    if(revealed) return;
    revealed = true;
    host.classList.add('mcqs-ready');     // fades the tool in (guard stylesheet)
  }

  var cssReady = false, libsReady = false;
  function maybeReveal(){
    if(!(cssReady && libsReady)) return;
    // Two animation frames give Tailwind's runtime time to inject the styles it
    // generates for the freshly-added markup before we fade the tool in.
    requestAnimationFrame(function(){ requestAnimationFrame(reveal); });
  }

  // Safety net: never leave the tool hidden if a CDN is slow or blocked.
  setTimeout(reveal, 2500);

  // Auto-load our own stylesheet from the same CDN folder as this script, and
  // wait for it before revealing.
  if(BASE){ ensureCSS(BASE + 'mcqs.css', 'self', function(){ cssReady = true; maybeReveal(); }); }
  else { cssReady = true; }

  // Inject the tool markup (synchronous) — hidden by the guard style above.
  host.innerHTML = '<div class="mcqs-app-root">' + MARKUP + '</div>';

  // Load third-party deps, THEN the application. Revealing waits on the deps
  // (Tailwind in particular) so the layout is correct on the first visible paint.
  loadDeps().then(function(){
    if(BASE){ loadScript(BASE + 'mcqs.app.js'); }
    else { console.error('[MCQsTool] Could not resolve script BASE url; load mcqs.js from a real URL.'); }
    libsReady = true;
    maybeReveal();
  });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

// Optional manual entry point.
window.MCQsTool = window.MCQsTool || {};
window.MCQsTool.mount = mount;
})();
