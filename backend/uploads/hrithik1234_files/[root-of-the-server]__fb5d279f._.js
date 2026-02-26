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
"[project]/PRO CONNECT/frontend/src/Components/Navbar/styles.module.css [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "buttonJoin": "styles-module__4AJ-VG__buttonJoin",
  "container": "styles-module__4AJ-VG__container",
  "navBar": "styles-module__4AJ-VG__navBar",
  "navBarOptionContainer": "styles-module__4AJ-VG__navBarOptionContainer",
});
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
"[project]/PRO CONNECT/frontend/src/config/redux/action/postAction/index.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createPost",
    ()=>createPost,
    "deletePost",
    ()=>deletePost,
    "getAllComments",
    ()=>getAllComments,
    "getAllPosts",
    ()=>getAllPosts,
    "incrementPostLikes",
    ()=>incrementPostLikes,
    "postComment",
    ()=>postComment
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/@reduxjs/toolkit/dist/redux-toolkit.modern.mjs [client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$postcss$2f$lib$2f$postcss$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/postcss/lib/postcss.mjs [client] (ecmascript)");
;
;
;
const getAllPosts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("post/getAllPosts", async (_, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].get("/posts");
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data);
    }
});
const createPost = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("post/createPost", async (usertData, thunkAPI)=>{
    const { file, body } = usertData;
    try {
        const formData = new FormData();
        formData.append("token", localStorage.getItem("token"));
        formData.append("body", body);
        formData.append("media", file);
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/post", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });
        if (response.status === 200) {
            return thunkAPI.fulfillWithValue("Post Uploaded");
        } else {
            return thunkAPI.rejectWithValue("Error in uploading post");
        }
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data);
    }
});
const deletePost = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("post/deletePost", async (post_id, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].delete("/delete_post", {
            data: {
                token: localStorage.getItem("token"),
                post_id: post_id.post_id
            }
        });
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data);
    }
});
const incrementPostLikes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("post/incrementPostLikes", async (post, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/increment_post_like", {
            post_id: post.post_id
        });
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data);
    }
});
const getAllComments = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("post/getAllComments", async (postData, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/get_comment", null, {
            params: {
                post_id: postData.post_id
            }
        });
        return thunkAPI.fulfillWithValue({
            comments: response.data,
            post_id: postData.post_id
        });
    } catch (err) {
        return thunkAPI.rejectWithValue("Something went wrong");
    }
});
const postComment = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("post/postComment", async (commentData, thunkAPI)=>{
    try {
        console.log({
            post_id: commentData.post_id,
            body: commentData.body
        });
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/comment", {
            post_id: commentData.post_id,
            commentBody: commentData.body,
            token: localStorage.getItem("token")
        });
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data);
    }
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.module.css [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "homeConatiner": "index-module__dpnwCq__homeConatiner",
  "homeContainer__feedConatiner": "index-module__dpnwCq__homeContainer__feedConatiner",
  "homeContainer__leftBar": "index-module__dpnwCq__homeContainer__leftBar",
  "homecontainer__extraConatiner": "index-module__dpnwCq__homecontainer__extraConatiner",
  "mobileNavBar": "index-module__dpnwCq__mobileNavBar",
  "sideBarOption": "index-module__dpnwCq__sideBarOption",
});
}),
"[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.module.css [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$reducer$2f$authReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/redux/reducer/authReducer/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react-redux/dist/react-redux.mjs [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
function DashboardLayout({ children }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const dispatch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"])();
    const authState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"])({
        "DashboardLayout.useSelector[authState]": (state)=>state.auth
    }["DashboardLayout.useSelector[authState]"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DashboardLayout.useEffect": ()=>{
            if (localStorage.getItem("token") === null) {
                router.push("/login");
            }
            dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$reducer$2f$authReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["setTokenIsThere"])());
        }
    }["DashboardLayout.useEffect"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "conatiner",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].homeConatiner,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].homeContainer__leftBar,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    onClick: ()=>{
                                        router.push("/dashboard");
                                    },
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].sideBarOption,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            xmlns: "http://www.w3.org/2000/svg",
                                            fill: "none",
                                            viewBox: "0 0 24 24",
                                            strokeWidth: 1.5,
                                            stroke: "currentColor",
                                            className: "size-6",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                d: "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                                lineNumber: 25,
                                                columnNumber: 3
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                            lineNumber: 24,
                                            columnNumber: 25
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "Scroll"
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                            lineNumber: 28,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                    lineNumber: 21,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    onClick: ()=>{
                                        router.push("/discover");
                                    },
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].sideBarOption,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            xmlns: "http://www.w3.org/2000/svg",
                                            fill: "none",
                                            viewBox: "0 0 24 24",
                                            strokeWidth: 1.5,
                                            stroke: "currentColor",
                                            className: "size-6",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                d: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                                lineNumber: 34,
                                                columnNumber: 3
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                            lineNumber: 33,
                                            columnNumber: 25
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "Discover"
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                            lineNumber: 36,
                                            columnNumber: 22
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                    lineNumber: 30,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    onClick: ()=>{
                                        router.push("/my_connections");
                                    },
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].sideBarOption,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            xmlns: "http://www.w3.org/2000/svg",
                                            fill: "none",
                                            viewBox: "0 0 24 24",
                                            strokeWidth: 1.5,
                                            stroke: "currentColor",
                                            className: "size-6",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                d: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                                lineNumber: 42,
                                                columnNumber: 3
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                            lineNumber: 41,
                                            columnNumber: 25
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "My Connections"
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                            lineNumber: 45,
                                            columnNumber: 22
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                    lineNumber: 38,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                            lineNumber: 20,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].homeContainer__feedConatiner,
                            children: children
                        }, void 0, false, {
                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                            lineNumber: 50,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].homecontainer__extraConatiner,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    children: "Top Profile"
                                }, void 0, false, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                    lineNumber: 55,
                                    columnNumber: 19
                                }, this),
                                authState.all_profiles_fetched && authState.all_users.map((profile)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: profile.userId?.name
                                    }, profile._id, false, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                        lineNumber: 57,
                                        columnNumber: 3
                                    }, this))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                            lineNumber: 54,
                            columnNumber: 17
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                    lineNumber: 19,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                lineNumber: 18,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].mobileNavBar,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onClick: ()=>{
                            router.push("/dashboard");
                        },
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleNavItemHolder_mobileView,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            xmlns: "http://www.w3.org/2000/svg",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            strokeWidth: 1.5,
                            stroke: "currentColor",
                            className: "size-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                d: "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                            }, void 0, false, {
                                fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                lineNumber: 68,
                                columnNumber: 3
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                            lineNumber: 67,
                            columnNumber: 17
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                        lineNumber: 64,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onClick: ()=>{
                            router.push("/discover");
                        },
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleNavItemHolder_mobileView,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            xmlns: "http://www.w3.org/2000/svg",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            strokeWidth: 1.5,
                            stroke: "currentColor",
                            className: "size-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                d: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                            }, void 0, false, {
                                fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                lineNumber: 76,
                                columnNumber: 3
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                            lineNumber: 75,
                            columnNumber: 22
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                        lineNumber: 72,
                        columnNumber: 22
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onClick: ()=>{
                            router.push("/my_connections");
                        },
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleNavItemHolder_mobileView,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            xmlns: "http://www.w3.org/2000/svg",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            strokeWidth: 1.5,
                            stroke: "currentColor",
                            className: "size-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                d: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                            }, void 0, false, {
                                fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                                lineNumber: 83,
                                columnNumber: 3
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                            lineNumber: 82,
                            columnNumber: 22
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                        lineNumber: 79,
                        columnNumber: 22
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
                lineNumber: 63,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx",
        lineNumber: 17,
        columnNumber: 9
    }, this);
}
_s(DashboardLayout, "kUhjSA18lKx4itH0Q7D53Z2hSdQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"]
    ];
});
_c = DashboardLayout;
const __TURBOPACK__default__export__ = DashboardLayout;
var _c;
__turbopack_context__.k.register(_c, "DashboardLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/PRO CONNECT/frontend/src/pages/dashboard/index.module.css [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "Fab": "index-module__ihxmzG__Fab",
  "allCommentsContainer": "index-module__ihxmzG__allCommentsContainer",
  "commentsContainer": "index-module__ihxmzG__commentsContainer",
  "commentsList": "index-module__ihxmzG__commentsList",
  "createPostContainer": "index-module__ihxmzG__createPostContainer",
  "optionsContainer": "index-module__ihxmzG__optionsContainer",
  "postCommentContainer": "index-module__ihxmzG__postCommentContainer",
  "postCommentContainer_commentBtn": "index-module__ihxmzG__postCommentContainer_commentBtn",
  "scrollComponent": "index-module__ihxmzG__scrollComponent",
  "singleCard": "index-module__ihxmzG__singleCard",
  "singleCard__profileContainer": "index-module__ihxmzG__singleCard__profileContainer",
  "singleCard_image": "index-module__ihxmzG__singleCard_image",
  "singleComment": "index-module__ihxmzG__singleComment",
  "singleContainer__optionsContainer": "index-module__ihxmzG__singleContainer__optionsContainer",
  "textAreaOfContent": "index-module__ihxmzG__textAreaOfContent",
  "uploadButton": "index-module__ihxmzG__uploadButton",
  "userProfile": "index-module__ihxmzG__userProfile",
  "wrapper": "index-module__ihxmzG__wrapper",
});
}),
"[project]/PRO CONNECT/frontend/src/config/redux/reducer/postReducer/index.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "resetPostId",
    ()=>resetPostId
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/@reduxjs/toolkit/dist/redux-toolkit.modern.mjs [client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/redux/action/postAction/index.js [client] (ecmascript)");
;
;
const initialState = {
    posts: [],
    isLoading: false,
    isError: false,
    message: "",
    loggedIn: false,
    postFetched: false,
    comments: [],
    postId: ""
};
const postSlice = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createSlice"])({
    name: "post",
    initialState,
    reducers: {
        reset: ()=>initialState,
        resetPostId: (state)=>{
            state.postId = "";
        }
    },
    extraReducers: (builder)=>{
        builder.addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllPosts"].pending, (state)=>{
            state.isLoading = true;
            state.message = "Fetching posts...";
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllPosts"].fulfilled, (state, action)=>{
            state.isLoading = false;
            state.isError = false;
            state.posts = action.payload.posts.reverse();
            state.postFetched = true;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllPosts"].rejected, (state, action)=>{
            state.isLoading = false;
            state.isError = true;
            state.message = action.payload;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllComments"].fulfilled, (state, action)=>{
            state.postId = action.payload.post_id;
            state.comments = action.payload.comments;
        });
    }
});
const { resetPostId } = postSlice.actions;
const __TURBOPACK__default__export__ = postSlice.reducer;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/redux/action/authAction/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/redux/action/postAction/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$UserLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/layout/UserLayout/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react-redux/dist/react-redux.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/pages/dashboard/index.module.css [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$reducer$2f$postReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/redux/reducer/postReducer/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
;
;
;
;
;
function Dashboard() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const dispatch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"])();
    const authState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"])({
        "Dashboard.useSelector[authState]": (state)=>state.auth
    }["Dashboard.useSelector[authState]"]);
    const postState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"])({
        "Dashboard.useSelector[postState]": (state)=>state.posts
    }["Dashboard.useSelector[postState]"]);
    console.log(postState.posts);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Dashboard.useEffect": ()=>{
            if (authState.isTokenThere) {
                dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllPosts"])());
                dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAboutUser"])({
                    token: localStorage.getItem("token")
                }));
            }
            if (!authState.all_profiles_fetched) {
                dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllUsers"])());
            }
        }
    }["Dashboard.useEffect"], [
        authState.isTokenThere
    ]);
    const [postContent, setPostContent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [fileContent, setFileContent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [commentText, setCommentText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const handleUpload = async ()=>{
        await dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["createPost"])({
            body: postContent,
            file: fileContent
        }));
        setFileContent('');
        setPostContent("");
        dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllPosts"])());
    };
    if (authState.user) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$UserLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].scrollComponent,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].wrapper,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].createPostContainer,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].userProfile,
                                            src: `${__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/${authState.user.userId.profilePicture}`
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                            lineNumber: 55,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                            onChange: (e)=>{
                                                setPostContent(e.target.value);
                                            },
                                            value: postContent,
                                            placeholder: "Whats in your mind?",
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].textAreaOfContent,
                                            name: " ",
                                            id: ""
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                            lineNumber: 56,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "fileUpload",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].Fab,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                    xmlns: "http://www.w3.org/2000/svg",
                                                    fill: "none",
                                                    viewBox: "0 0 24 24",
                                                    strokeWidth: 1.5,
                                                    stroke: "currentColor",
                                                    className: "size-6",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        d: "M12 4.5v15m7.5-7.5h-15"
                                                    }, void 0, false, {
                                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                        lineNumber: 62,
                                                        columnNumber: 3
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                    lineNumber: 61,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                lineNumber: 60,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                            lineNumber: 59,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            onChange: (e)=>{
                                                setFileContent(e.target.files[0]);
                                            },
                                            type: "file",
                                            hidden: true,
                                            id: "fileUpload"
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                            lineNumber: 67,
                                            columnNumber: 17
                                        }, this),
                                        postContent.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            onClick: ()=>{
                                                handleUpload();
                                            },
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].uploadButton,
                                            children: "Post"
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                            lineNumber: 71,
                                            columnNumber: 18
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                    lineNumber: 54,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].postContainer,
                                    children: postState.posts.map((post)=>{
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleCard,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleCard__profileContainer,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                        onClick: ()=>{
                                                            router.push(`view_profile/${post.userId.username}`);
                                                        },
                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleCard__profileImage,
                                                        src: `${__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/${post.userId.profilePicture}`
                                                    }, void 0, false, {
                                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                        lineNumber: 84,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    display: "flex",
                                                                    justifyContent: "space-between",
                                                                    gap: "1.2rem"
                                                                },
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        onClick: ()=>{
                                                                            router.push(`view_profile/${post.userId.username}`);
                                                                        },
                                                                        style: {
                                                                            fontWeight: "bold"
                                                                        },
                                                                        children: post.userId.name
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                        lineNumber: 89,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    post.userId._id === authState.user.userId._id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        onClick: async ()=>{
                                                                            await dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["deletePost"])({
                                                                                post_id: post._id
                                                                            }));
                                                                            await dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllPosts"])());
                                                                        },
                                                                        style: {
                                                                            cursor: "pointer"
                                                                        },
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                            style: {
                                                                                height: "1.4rem",
                                                                                color: "red"
                                                                            },
                                                                            xmlns: "http://www.w3.org/2000/svg",
                                                                            fill: "none",
                                                                            viewBox: "0 0 24 24",
                                                                            strokeWidth: 1.5,
                                                                            stroke: "currentColor",
                                                                            className: "size-6",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                                strokeLinecap: "round",
                                                                                strokeLinejoin: "round",
                                                                                d: "m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                                lineNumber: 98,
                                                                                columnNumber: 4
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                            lineNumber: 97,
                                                                            columnNumber: 24
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                        lineNumber: 93,
                                                                        columnNumber: 24
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                lineNumber: 88,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                style: {
                                                                    color: "grey"
                                                                },
                                                                children: post.userId.username
                                                            }, void 0, false, {
                                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                lineNumber: 108,
                                                                columnNumber: 24
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                style: {
                                                                    paddingTop: "1.3rem"
                                                                },
                                                                children: post.body
                                                            }, void 0, false, {
                                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                lineNumber: 109,
                                                                columnNumber: 24
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleCard_image,
                                                                children: post.media !== "" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                    src: `${__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/${post.media}`
                                                                }, void 0, false, {
                                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                    lineNumber: 111,
                                                                    columnNumber: 45
                                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {}, void 0, false)
                                                            }, void 0, false, {
                                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                lineNumber: 110,
                                                                columnNumber: 24
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].optionsContainer,
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        onClick: async ()=>{
                                                                            dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["incrementPostLikes"])({
                                                                                post_id: post._id
                                                                            }));
                                                                            dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllPosts"])());
                                                                        },
                                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleContainer__optionsContainer,
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                                xmlns: "http://www.w3.org/2000/svg",
                                                                                fill: "none",
                                                                                viewBox: "0 0 24 24",
                                                                                strokeWidth: 1.5,
                                                                                stroke: "currentColor",
                                                                                className: "size-6",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                                    strokeLinecap: "round",
                                                                                    strokeLinejoin: "round",
                                                                                    d: "M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                                    lineNumber: 120,
                                                                                    columnNumber: 3
                                                                                }, this)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                                lineNumber: 119,
                                                                                columnNumber: 25
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                children: post.likes
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                                lineNumber: 122,
                                                                                columnNumber: 25
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                        lineNumber: 114,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        onClick: ()=>{
                                                                            dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllComments"])({
                                                                                post_id: post._id
                                                                            }));
                                                                        },
                                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleContainer__optionsContainer,
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                            xmlns: "http://www.w3.org/2000/svg",
                                                                            fill: "none",
                                                                            viewBox: "0 0 24 24",
                                                                            strokeWidth: 1.5,
                                                                            stroke: "currentColor",
                                                                            className: "size-6",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                                strokeLinecap: "round",
                                                                                strokeLinejoin: "round",
                                                                                d: "M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                                lineNumber: 131,
                                                                                columnNumber: 3
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                            lineNumber: 130,
                                                                            columnNumber: 25
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                        lineNumber: 126,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        onClick: ()=>{
                                                                            const text = encodeURIComponent(post.body);
                                                                            const url = encodeURIComponent("apnacollege.in");
                                                                            const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
                                                                            window.open(twitterUrl, '_blank');
                                                                        },
                                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleContainer__optionsContainer,
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                            xmlns: "http://www.w3.org/2000/svg",
                                                                            fill: "none",
                                                                            viewBox: "0 0 24 24",
                                                                            strokeWidth: 1.5,
                                                                            stroke: "currentColor",
                                                                            className: "size-6",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                                strokeLinecap: "round",
                                                                                strokeLinejoin: "round",
                                                                                d: "M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                                lineNumber: 145,
                                                                                columnNumber: 3
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                            lineNumber: 144,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                        lineNumber: 137,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                lineNumber: 113,
                                                                columnNumber: 24
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                        lineNumber: 87,
                                                        columnNumber: 22
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                lineNumber: 83,
                                                columnNumber: 23
                                            }, this)
                                        }, post._id, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                            lineNumber: 81,
                                            columnNumber: 21
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                    lineNumber: 78,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                            lineNumber: 53,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                        lineNumber: 52,
                        columnNumber: 13
                    }, this),
                    postState.postId !== "" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onClick: ()=>{
                            dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$reducer$2f$postReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["resetPostId"])());
                        },
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].commentsContainer,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            onClick: (e)=>{
                                e.stopPropagation();
                            },
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].allCommentsContainer,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].commentsList,
                                children: [
                                    postState.comments.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        children: "No Comments"
                                    }, void 0, false, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                        lineNumber: 180,
                                        columnNumber: 53
                                    }, this),
                                    postState.comments.length !== 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: postState.comments.map((postComment)=>{
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleComment,
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleComment__profileContainer,
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                    src: `${__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/${postComment.userId.profilePicture}`,
                                                                    alt: ""
                                                                }, void 0, false, {
                                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                    lineNumber: 190,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            style: {
                                                                                fontWeight: "bold",
                                                                                fontSize: "1.2rem"
                                                                            },
                                                                            children: postComment.userId.name
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                            lineNumber: 192,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            children: [
                                                                                "@",
                                                                                postComment.userId.username
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                            lineNumber: 193,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                                    lineNumber: 191,
                                                                    columnNumber: 28
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                            lineNumber: 189,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            children: postComment.body
                                                        }, void 0, false, {
                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                            lineNumber: 197,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, postComment._id, true, {
                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                    lineNumber: 188,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                lineNumber: 186,
                                                columnNumber: 25
                                            }, this);
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                        lineNumber: 183,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].postCommentContainer,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                value: commentText,
                                                type: "text",
                                                placeholder: "Add a comment...",
                                                onChange: (e)=>{
                                                    setCommentText(e.target.value);
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                lineNumber: 207,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                onClick: async ()=>{
                                                    await dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["postComment"])({
                                                        post_id: postState.postId,
                                                        body: commentText
                                                    }));
                                                    await dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllComments"])({
                                                        post_id: postState.postId
                                                    }));
                                                },
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].postCommentContainer_commentBtn,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    children: "Comment"
                                                }, void 0, false, {
                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                    lineNumber: 212,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                                lineNumber: 208,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                        lineNumber: 206,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                                lineNumber: 178,
                                columnNumber: 20
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                            lineNumber: 175,
                            columnNumber: 17
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                        lineNumber: 172,
                        columnNumber: 15
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                lineNumber: 50,
                columnNumber: 11
            }, this)
        }, void 0, false, {
            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
            lineNumber: 49,
            columnNumber: 9
        }, this);
    } else {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$UserLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    children: "Loading..."
                }, void 0, false, {
                    fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                    lineNumber: 231,
                    columnNumber: 13
                }, this)
            }, void 0, false, {
                fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
                lineNumber: 230,
                columnNumber: 11
            }, this)
        }, void 0, false, {
            fileName: "[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx",
            lineNumber: 229,
            columnNumber: 9
        }, this);
    }
}
_s(Dashboard, "vd2YGept8QNdTXPe76vZWjEbaew=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"]
    ];
});
_c = Dashboard;
const __TURBOPACK__default__export__ = Dashboard;
var _c;
__turbopack_context__.k.register(_c, "Dashboard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/PRO CONNECT/frontend/src/pages/view_profile/styles.module.css [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "backDropContainer": "styles-module__RwctPG__backDropContainer",
  "car": "styles-module__RwctPG__car",
  "card_profileContainer": "styles-module__RwctPG__card_profileContainer",
  "connectBtn": "styles-module__RwctPG__connectBtn",
  "connectedButton": "styles-module__RwctPG__connectedButton",
  "container": "styles-module__RwctPG__container",
  "profileContainer__flex": "styles-module__RwctPG__profileContainer__flex",
  "profileContainer_details": "styles-module__RwctPG__profileContainer_details",
  "workHistoryCard": "styles-module__RwctPG__workHistoryCard",
  "workHistoryConatiner": "styles-module__RwctPG__workHistoryConatiner",
});
}),
"[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__N_SSP",
    ()=>__N_SSP,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$UserLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/layout/UserLayout/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/next/navigation.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$dashboard$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/pages/dashboard/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/layout/DashboardLayout/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/node_modules/react-redux/dist/react-redux.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/pages/view_profile/styles.module.css [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/redux/action/postAction/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/PRO CONNECT/frontend/src/config/redux/action/authAction/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
;
;
;
;
;
function ViewProfilePage({ userProfile }) {
    _s();
    console.log("heeloo", userProfile);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const postReducer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"])({
        "ViewProfilePage.useSelector[postReducer]": (state)=>state.posts
    }["ViewProfilePage.useSelector[postReducer]"]);
    const dispatch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"])();
    const authState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"])({
        "ViewProfilePage.useSelector[authState]": (state)=>state.auth
    }["ViewProfilePage.useSelector[authState]"]);
    const [userPosts, setUserPosts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isCurrentUserInConnections, setIsCurrentUserInConnections] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isConnectionNull, setIsConnectionNull] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ViewProfilePage.useEffect": ()=>{
            let post = postReducer.posts.filter({
                "ViewProfilePage.useEffect.post": (post)=>{
                    return post.userId.username === router.query.username;
                }
            }["ViewProfilePage.useEffect.post"]);
            setUserPosts(post);
        }
    }["ViewProfilePage.useEffect"], [
        postReducer.posts
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ViewProfilePage.useEffect": ()=>{
            console.log(authState.connections, userProfile.userId._id);
            if (authState.connections.some({
                "ViewProfilePage.useEffect": (user)=>user.connectionId._id === userProfile.userId._id
            }["ViewProfilePage.useEffect"])) {
                setIsCurrentUserInConnections(true);
                if (authState.connections.find({
                    "ViewProfilePage.useEffect": (user)=>user.connectionId._id === userProfile.userId._id
                }["ViewProfilePage.useEffect"]).Status_accepted === true) {
                    setIsConnectionNull(false);
                }
            }
            if (authState.connectionRequest.some({
                "ViewProfilePage.useEffect": (user)=>user.userId._id === userProfile.userId._id
            }["ViewProfilePage.useEffect"])) {
                setIsCurrentUserInConnections(true);
                if (authState.connectionRequest.find({
                    "ViewProfilePage.useEffect": (user)=>user.userId._id === userProfile.userId._id
                }["ViewProfilePage.useEffect"]).Status_accepted === true) {
                    setIsConnectionNull(false);
                }
            }
        }
    }["ViewProfilePage.useEffect"], [
        authState.connections,
        authState.connectionRequest
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ViewProfilePage.useEffect": ()=>{
            dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$postAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllPosts"])());
            dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getConnectionRequests"])({
                token: localStorage.getItem("token")
            }));
            dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getMyConnectionRequests"])({
                token: localStorage.getItem("token")
            }));
        }
    }["ViewProfilePage.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ViewProfilePage.useEffect": ()=>{
            console.log("view profile");
        }
    }["ViewProfilePage.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$UserLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$layout$2f$DashboardLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].container,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].backDropContainer,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                            src: `${__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/${userProfile.userId.profilePicture}`,
                            alt: userProfile.userId.name
                        }, void 0, false, {
                            fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                            lineNumber: 63,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                        lineNumber: 62,
                        columnNumber: 9
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                    lineNumber: 61,
                    columnNumber: 6
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].profileContainer_details,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].profileContainer__flex,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    flex: "0.8"
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: "flex",
                                            width: "fit-content",
                                            alignItems: "center",
                                            gap: "1.2rem"
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                children: userProfile.userId.name
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                lineNumber: 70,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    color: "grey"
                                                },
                                                children: [
                                                    "@",
                                                    userProfile.userId.username
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                lineNumber: 71,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                        lineNumber: 69,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "1rem",
                                            marginBlock: "1rem"
                                        },
                                        children: [
                                            isCurrentUserInConnections ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].connectedButton,
                                                children: isConnectionNull ? "Pending" : "Connected"
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                lineNumber: 75,
                                                columnNumber: 17
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>{
                                                    dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["sendConnectionRequest"])({
                                                        token: localStorage.getItem("token"),
                                                        user_id: userProfile.userId._id
                                                    }));
                                                },
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].connectBtn,
                                                children: "Connect"
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                lineNumber: 77,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                onClick: async ()=>{
                                                    const resposne = await __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].get(`/user/download_resume?id=${userProfile.userId._id}`);
                                                    window.open(`${__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/${resposne.data.message}`, '_blank');
                                                },
                                                style: {
                                                    cursor: "pointer"
                                                },
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                    style: {
                                                        width: "1.2em"
                                                    },
                                                    xmlns: "http://www.w3.org/2000/svg",
                                                    fill: "none",
                                                    viewBox: "0 0 24 24",
                                                    strokeWidth: 1.5,
                                                    stroke: "currentColor",
                                                    className: "size-6",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        d: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                                                    }, void 0, false, {
                                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                        lineNumber: 87,
                                                        columnNumber: 3
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                    lineNumber: 86,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                lineNumber: 82,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                        lineNumber: 73,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: userProfile.bio
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                            lineNumber: 95,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                        lineNumber: 94,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                lineNumber: 68,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    flex: "0.2"
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        children: "Recent Activity"
                                    }, void 0, false, {
                                        fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                        lineNumber: 100,
                                        columnNumber: 17
                                    }, this),
                                    userPosts.map((post)=>{
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].postCard,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].card
                                                }, void 0, false, {
                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                    lineNumber: 104,
                                                    columnNumber: 28
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].card_profileContainer,
                                                    children: [
                                                        post.media !== "" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                            src: `${__TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/${post.media}`,
                                                            alt: ""
                                                        }, void 0, false, {
                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                            lineNumber: 106,
                                                            columnNumber: 50
                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                width: "3.4rem",
                                                                height: "3.4rem"
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                            lineNumber: 107,
                                                            columnNumber: 29
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            children: post.body
                                                        }, void 0, false, {
                                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                            lineNumber: 108,
                                                            columnNumber: 29
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                                    lineNumber: 105,
                                                    columnNumber: 28
                                                }, this)
                                            ]
                                        }, post._id, true, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                            lineNumber: 103,
                                            columnNumber: 25
                                        }, this);
                                    })
                                ]
                            }, void 0, true, {
                                fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                lineNumber: 99,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                        lineNumber: 67,
                        columnNumber: 9
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                    lineNumber: 66,
                    columnNumber: 6
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].workHistory,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                            children: "Work History"
                        }, void 0, false, {
                            fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                            lineNumber: 117,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].workHistoryConatiner,
                            children: userProfile.pastWork.map((work, index)=>{
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$src$2f$pages$2f$view_profile$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].workHistoryCard,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            style: {
                                                fontWeight: "bold ",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.8rem"
                                            },
                                            children: [
                                                work.company,
                                                " - ",
                                                work.position,
                                                " "
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                            lineNumber: 123,
                                            columnNumber: 26
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: work.years
                                        }, void 0, false, {
                                            fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                            lineNumber: 124,
                                            columnNumber: 24
                                        }, this)
                                    ]
                                }, index, true, {
                                    fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                                    lineNumber: 122,
                                    columnNumber: 25
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                            lineNumber: 118,
                            columnNumber: 9
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
                    lineNumber: 116,
                    columnNumber: 6
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
            lineNumber: 60,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx",
        lineNumber: 59,
        columnNumber: 9
    }, this);
}
_s(ViewProfilePage, "AHQ6Rm74nzRNpoJW77SjAT3b2s4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"],
        __TURBOPACK__imported__module__$5b$project$5d2f$PRO__CONNECT$2f$frontend$2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"]
    ];
});
_c = ViewProfilePage;
var __N_SSP = true;
const __TURBOPACK__default__export__ = ViewProfilePage;
var _c;
__turbopack_context__.k.register(_c, "ViewProfilePage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/view_profile/[username]";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx [client] (ecmascript)");
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
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/PRO CONNECT/frontend/src/pages/view_profile/[username].jsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__fb5d279f._.js.map