(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/PRO CONNECT/frontend/src/Components/Navbar/styles.module.css [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "buttonJoin": "styles-module__4AJ-VG__buttonJoin",
  "container": "styles-module__4AJ-VG__container",
  "navBar": "styles-module__4AJ-VG__navBar",
  "navBarOptionContainer": "styles-module__4AJ-VG__navBarOptionContainer",
});
}),
"[project]/PRO CONNECT/frontend/src/config/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BASE_URL",
    ()=>BASE_URL,
    "clientServer",
    ()=>clientServer
]);
const { default: axios } = __turbopack_context__.r("[project]/PRO CONNECT/frontend/node_modules/axios/dist/browser/axios.cjs [client] (ecmascript)");
const BASE_URL = "http://localhost:9080";
const clientServer = axios.create({
    baseURL: BASE_URL
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/PRO CONNECT/frontend/src/config/redux/action/authAction/index.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AcceptConnection",
    ()=>AcceptConnection,
    "getAboutUser",
    ()=>getAboutUser,
    "getAllUsers",
    ()=>getAllUsers,
    "getConnectionRequests",
    ()=>getConnectionRequests,
    "getMyConnectionRequests",
    ()=>getMyConnectionRequests,
    "loginUser",
    ()=>loginUser,
    "registerUser",
    ()=>registerUser,
    "sendConnectionRequest",
    ()=>sendConnectionRequest
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/@reduxjs/toolkit/dist/redux-toolkit.modern.mjs [client] (ecmascript) <locals>");
;
;
const loginUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/login", async (user, thunkAPI)=>{
    console.log(user);
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/login", {
            email: user.email,
            password: user.password
        });
        console.log("✅ LOGIN RESPONSE:", response.data);
        if (response.data.token) {
            localStorage.setItem("token", response.data.token);
            return response.data;
        } else {
            return thunkAPI.rejectWithValue({
                message: "Token not provided"
            });
        }
    } catch (err) {
        console.error("❌ LOGIN ERROR:", err.response?.data || err.message);
        return thunkAPI.rejectWithValue(err.response?.data || {
            message: err.message
        });
    }
});
const registerUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/register", async (user, thunkAPI)=>{
    try {
        const request = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/register", {
            username: user.username,
            name: user.name,
            email: user.email,
            password: user.password
        });
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data);
    }
});
const getAboutUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/getAboutUser", async (user, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].get("/get_user_and_profile", {
            params: {
                token: user.token
            }
        });
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data);
    }
});
const getAllUsers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/getAllUsers", async (_, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].get("/all_users_profiles");
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data);
    }
});
const sendConnectionRequest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/sendConnectionRequest", async (user, thunkAPI)=>{
    try {
        console.log(user);
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/user/send_connection_request", {
            token: user.token,
            connectionId: user.user_id
        });
        thunkAPI.dispatch(getMyConnectionRequests({
            token: user.token
        }));
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data.message);
    }
});
const getConnectionRequests = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/getConnectionRequests", async (user, thunkAPI)=>{
    console.log("Fetching connection requests for user:", user);
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].get("/user/getConnectionRequests", {
            params: {
                token: user.token
            }
        });
        return thunkAPI.fulfillWithValue(response.data.conections);
    } catch (err) {
        console.log(err);
        return thunkAPI.rejectWithValue(err.response.data.message);
    }
});
const getMyConnectionRequests = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/getMyConnectionRequests", async (user, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].get("/user/user_connection_request", {
            params: {
                token: user.token
            }
        });
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        console.log(err);
        return thunkAPI.rejectWithValue(err.response.data.message);
    }
});
const AcceptConnection = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/AcceptConnection", async (user, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/user/accept_connection_request", {
            token: user.token,
            requestId: user.connectionId,
            action_type: user.action
        });
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        console.log(err);
        return thunkAPI.rejectWithValue(err.response.data.message);
    }
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/PRO CONNECT/frontend/src/config/redux/reducer/authReducer/index.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "emptyMessage",
    ()=>emptyMessage,
    "reset",
    ()=>reset,
    "setTokenIsNotThere",
    ()=>setTokenIsNotThere,
    "setTokenIsThere",
    ()=>setTokenIsThere
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/@reduxjs/toolkit/dist/redux-toolkit.modern.mjs [client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/redux/action/authAction/index.js [client] (ecmascript)");
;
;
const initialState = {
    user: undefined,
    isError: true,
    isSuccess: false,
    isLoading: false,
    isloggedIn: false,
    message: "",
    isTokenThere: false,
    profileFetched: false,
    connections: [],
    all_users: [],
    connectionRequest: [],
    all_profiles_fetched: false
};
const authSlice = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createSlice"])({
    name: "auth",
    initialState,
    reducers: {
        reset: ()=>initialState,
        handleLoginUser: (state)=>{
            state.message = "hello";
        },
        emptyMessage: (state)=>{
            state.message = "";
        },
        setTokenIsThere: (state, action)=>{
            state.isTokenThere = true;
        },
        setTokenIsNotThere: (state, action)=>{
            state.isTokenThere = false;
        }
    },
    extraReducers: (builder)=>{
        builder.addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["loginUser"].pending, (state)=>{
            state.isLoading = true;
            state.message = "koncking the door";
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["loginUser"].fulfilled, (state, action)=>{
            state.isLoading = false;
            state.isError = false;
            state.isSuccess = true;
            state.isloggedIn = true;
            state.message = "Login is Successfull";
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["loginUser"].rejected, (state, action)=>{
            state.isLoading = false;
            state.isError = true;
            state.message = action.payload;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["registerUser"].pending, (state)=>{
            state.isLoading = true;
            state.message = "Registering user...";
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["registerUser"].fulfilled, (state, action)=>{
            state.isLoading = false;
            state.isError = false;
            state.isSuccess = true;
            state.isloggedIn = false;
            state.message = {
                message: "Registration is Successfull,please login now"
            };
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["registerUser"].rejected, (state, action)=>{
            state.isLoading = false;
            state.isError = true;
            state.message = action.payload;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAboutUser"].fulfilled, (state, action)=>{
            state.isLoading = false;
            state.isError = false;
            state.profileFetched = true;
            state.user = action.payload.profile;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllUsers"].fulfilled, (state, action)=>{
            state.isLoading = false;
            state.isError = false;
            state.all_profiles_fetched = true;
            state.all_users = action.payload.profiles;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getConnectionRequests"].fulfilled, (state, action)=>{
            state.connections = action.payload;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getConnectionRequests"].rejected, (state, action)=>{
            state.message = action.payload;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getMyConnectionRequests"].fulfilled, (state, action)=>{
            state.connectionRequest = action.payload;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getMyConnectionRequests"].rejected, (state, action)=>{
            state.message = action.payload;
        });
    }
});
const { reset, emptyMessage, setTokenIsNotThere, setTokenIsThere } = authSlice.actions;
const __TURBOPACK__default__export__ = authSlice.reducer;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/PRO CONNECT/frontend/src/Components/Navbar/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$Components$2f$Navbar$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/Components/Navbar/styles.module.css [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react-redux/dist/react-redux.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$reducer$2f$authReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/redux/reducer/authReducer/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
function Navbar() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const authState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"])({
        "Navbar.useSelector[authState]": (state)=>state.auth
    }["Navbar.useSelector[authState]"]);
    const dispatch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$Components$2f$Navbar$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].container,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$Components$2f$Navbar$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].navBar,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    style: {
                        cursor: "pointer"
                    },
                    onClick: ()=>{
                        router.push("/");
                    },
                    children: "Pro Connect"
                }, void 0, false, {
                    fileName: "[project]/PRO CONNECT/frontend/src/Components/Navbar/index.jsx",
                    lineNumber: 13,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$Components$2f$Navbar$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].navBarOptionConatiner,
                    children: [
                        authState.profileFetched && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: "flex",
                                gap: "1.2rem"
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: [
                                        "Hey,",
                                        authState.user.userId.name
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/Components/Navbar/index.jsx",
                                    lineNumber: 18,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    onClick: ()=>{
                                        router.push("/profile");
                                    },
                                    style: {
                                        cursor: "pointer",
                                        fontWeight: "bold"
                                    },
                                    children: "Profile"
                                }, void 0, false, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/Components/Navbar/index.jsx",
                                    lineNumber: 19,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    onClick: ()=>{
                                        localStorage.removeItem("token");
                                        router.push("/login");
                                        dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$reducer$2f$authReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["reset"])());
                                    },
                                    style: {
                                        cursor: "pointer",
                                        fontWeight: "bold"
                                    },
                                    children: "Logout"
                                }, void 0, false, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/Components/Navbar/index.jsx",
                                    lineNumber: 22,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/PRO CONNECT/frontend/src/Components/Navbar/index.jsx",
                            lineNumber: 17,
                            columnNumber: 43
                        }, this),
                        !authState.profileFetched && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$Components$2f$Navbar$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].buttonJoin,
                            onClick: ()=>{
                                router.push("/login");
                            },
                            children: "Be a part"
                        }, void 0, false, {
                            fileName: "[project]/PRO CONNECT/frontend/src/Components/Navbar/index.jsx",
                            lineNumber: 29,
                            columnNumber: 18
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/PRO CONNECT/frontend/src/Components/Navbar/index.jsx",
                    lineNumber: 16,
                    columnNumber: 13
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/PRO CONNECT/frontend/src/Components/Navbar/index.jsx",
            lineNumber: 12,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/PRO CONNECT/frontend/src/Components/Navbar/index.jsx",
        lineNumber: 11,
        columnNumber: 9
    }, this);
}
_s(Navbar, "JhR9RMVRcJ6SObQY97vBXTgdltk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"]
    ];
});
_c = Navbar;
const __TURBOPACK__default__export__ = Navbar;
var _c;
__turbopack_context__.k.register(_c, "Navbar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/PRO CONNECT/frontend/src/layout/UserLayout/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$Components$2f$Navbar$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/Components/Navbar/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/index.js [client] (ecmascript)");
;
;
;
function UserLayout({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$Components$2f$Navbar$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/PRO CONNECT/frontend/src/layout/UserLayout/index.jsx",
                lineNumber: 6,
                columnNumber: 11
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/PRO CONNECT/frontend/src/layout/UserLayout/index.jsx",
        lineNumber: 5,
        columnNumber: 9
    }, this);
}
_c = UserLayout;
const __TURBOPACK__default__export__ = UserLayout;
var _c;
__turbopack_context__.k.register(_c, "UserLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/PRO CONNECT/frontend/src/pages/login/styles.module.css [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "buttonWithOutline": "styles-module__lL8LZa__buttonWithOutline",
  "buttonWithOutline1": "styles-module__lL8LZa__buttonWithOutline1",
  "cardContainer": "styles-module__lL8LZa__cardContainer",
  "cardContainer__left": "styles-module__lL8LZa__cardContainer__left",
  "cardContainer__right": "styles-module__lL8LZa__cardContainer__right",
  "cardleft_heading": "styles-module__lL8LZa__cardleft_heading",
  "container": "styles-module__lL8LZa__container",
  "eyeBall": "styles-module__lL8LZa__eyeBall",
  "forgotPassword": "styles-module__lL8LZa__forgotPassword",
  "inputContainer": "styles-module__lL8LZa__inputContainer",
  "inputField": "styles-module__lL8LZa__inputField",
  "inputRow": "styles-module__lL8LZa__inputRow",
});
}),
"[project]/PRO CONNECT/frontend/src/pages/login/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$UserLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/layout/UserLayout/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/pages/login/styles.module.css [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react-redux/dist/react-redux.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/redux/action/authAction/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$reducer$2f$authReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/redux/reducer/authReducer/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
function LoginComponent() {
    _s();
    const authState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"])({
        "LoginComponent.useSelector[authState]": (state)=>state.auth
    }["LoginComponent.useSelector[authState]"]);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const dispatch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"])();
    const [email, setEmailAddress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [username, setUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [visible, setVisible] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [userLoginMethod, setUserLoginMethod] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LoginComponent.useEffect": ()=>{
            if (authState.isloggedIn) {
                router.push("/dashboard");
            }
        }
    }["LoginComponent.useEffect"], [
        authState.isloggedIn
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LoginComponent.useEffect": ()=>{
            dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$reducer$2f$authReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["emptyMessage"])());
        }
    }["LoginComponent.useEffect"], [
        userLoginMethod
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LoginComponent.useEffect": ()=>{
            if (localStorage.getItem("token")) {
                router.push("/dashboard");
            }
        }
    }["LoginComponent.useEffect"], []);
    const handleRegister = ()=>{
        console.log("registerd");
        dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["registerUser"])({
            username,
            name,
            email,
            password
        }));
    };
    const handleLogin = ()=>{
        console.log(email, password);
        console.log("logined");
        dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["loginUser"])({
            email,
            password
        }));
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].container,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].cardContainer,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].cardContainer__left,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].cardleft_heading,
                                children: userLoginMethod ? "Sign In" : "Sign Up"
                            }, void 0, false, {
                                fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                lineNumber: 47,
                                columnNumber: 9
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    color: authState.isError ? "red" : "green"
                                },
                                children: authState.message.message
                            }, void 0, false, {
                                fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                lineNumber: 48,
                                columnNumber: 9
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].inputContainer,
                                children: [
                                    !userLoginMethod && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].inputRow,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                onChange: (e)=>{
                                                    setUsername(e.target.value);
                                                },
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].inputField,
                                                type: "text",
                                                placeholder: "Username"
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                                lineNumber: 51,
                                                columnNumber: 13
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                onChange: (e)=>{
                                                    setName(e.target.value);
                                                },
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].inputField,
                                                type: "text",
                                                placeholder: "Name"
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                                lineNumber: 54,
                                                columnNumber: 13
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                        lineNumber: 50,
                                        columnNumber: 36
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        onChange: (e)=>{
                                            setEmailAddress(e.target.value);
                                        },
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].inputField,
                                        type: "text",
                                        placeholder: "email"
                                    }, void 0, false, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                        lineNumber: 59,
                                        columnNumber: 9
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        onChange: (e)=>{
                                            setPassword(e.target.value);
                                        },
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].inputField,
                                        type: visible ? "password" : "text",
                                        placeholder: "Password"
                                    }, void 0, false, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                        lineNumber: 62,
                                        columnNumber: 9
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].eyeBall,
                                        children: [
                                            " ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                onClick: ()=>{
                                                    setVisible(!visible);
                                                },
                                                children: visible ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                    xmlns: "http://www.w3.org/2000/svg",
                                                    fill: "none",
                                                    viewBox: "0 0 24 24",
                                                    strokeWidth: 1.5,
                                                    stroke: "currentColor",
                                                    className: "size-6",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                            strokeLinecap: "round",
                                                            strokeLinejoin: "round",
                                                            d: "M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                                                        }, void 0, false, {
                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                                            lineNumber: 74,
                                                            columnNumber: 3
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                            strokeLinecap: "round",
                                                            strokeLinejoin: "round",
                                                            d: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                                        }, void 0, false, {
                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                                            lineNumber: 75,
                                                            columnNumber: 3
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                                    lineNumber: 73,
                                                    columnNumber: 19
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                    xmlns: "http://www.w3.org/2000/svg",
                                                    fill: "none",
                                                    viewBox: "0 0 24 24",
                                                    strokeWidth: 1.5,
                                                    stroke: "currentColor",
                                                    className: "size-6",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        d: "M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                                                    }, void 0, false, {
                                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                                        lineNumber: 78,
                                                        columnNumber: 3
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                                    lineNumber: 77,
                                                    columnNumber: 1
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                                lineNumber: 68,
                                                columnNumber: 39
                                            }, this),
                                            userLoginMethod ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                onClick: ()=>{
                                                    router.push("/ForgotPassword");
                                                },
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].forgotPassword,
                                                children: " Forgot password?"
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                                lineNumber: 81,
                                                columnNumber: 18
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {}, void 0, false)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                        lineNumber: 68,
                                        columnNumber: 5
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        onClick: ()=>{
                                            if (userLoginMethod) {
                                                handleLogin();
                                            } else {
                                                handleRegister();
                                            }
                                        },
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].buttonWithOutline1,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: userLoginMethod ? "Sign In" : "Sign Up"
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                            lineNumber: 95,
                                            columnNumber: 13
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                        lineNumber: 86,
                                        columnNumber: 9
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                lineNumber: 49,
                                columnNumber: 7
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                        lineNumber: 46,
                        columnNumber: 7
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].cardContainer__right,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                userLoginMethod ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: "Don't Have an Account "
                                }, void 0, false, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                    lineNumber: 103,
                                    columnNumber: 31
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: "Already have an account"
                                }, void 0, false, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                    lineNumber: 103,
                                    columnNumber: 63
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    onClick: ()=>{
                                        setUserLoginMethod(!userLoginMethod);
                                    },
                                    style: {
                                        color: "black",
                                        textAlign: "center",
                                        marginTop: "15px"
                                    },
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$login$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].buttonWithOutline,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: userLoginMethod ? "Sign Up" : "Sign In"
                                    }, void 0, false, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                        lineNumber: 109,
                                        columnNumber: 13
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                                    lineNumber: 105,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                            lineNumber: 102,
                            columnNumber: 9
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                        lineNumber: 101,
                        columnNumber: 7
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
                lineNumber: 44,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/PRO CONNECT/frontend/src/pages/login/index.jsx",
            lineNumber: 43,
            columnNumber: 13
        }, this)
    }, void 0, false);
}
_s(LoginComponent, "HVlDAWx9lRTzyzlMVBJPE9k753I=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"]
    ];
});
_c = LoginComponent;
const __TURBOPACK__default__export__ = LoginComponent;
var _c;
__turbopack_context__.k.register(_c, "LoginComponent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/PRO CONNECT/frontend/src/pages/login/index.jsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/login";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/PRO CONNECT/frontend/src/pages/login/index.jsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/PRO CONNECT/frontend/src/pages/login/index.jsx\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/PRO CONNECT/frontend/src/pages/login/index.jsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__2d494f71._.js.map