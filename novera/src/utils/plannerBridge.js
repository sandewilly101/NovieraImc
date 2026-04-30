/**
 * Contract between Novira and the embedded react-planner iframe (future / fork).
 * The stock cvdlab demo does not postMessage yet; a fork can call:
 *   window.parent.postMessage({ type: 'novira-planner-v1', payload: { ... } }, '*');
 */
export const PLANNER_MESSAGE_V1 = 'novira-planner-v1';

export const PLANNER_SESSION_KEY = 'novira_planner_snapshot_v1';

/** @param {unknown} data */
export function isPlannerV1Message(data) {
    return (
        data != null &&
        typeof data === 'object' &&
        data.type === PLANNER_MESSAGE_V1 &&
        'payload' in data
    );
}

/*
Fork hook (inside react-planner after export / save):
  window.parent.postMessage(
    { type: 'novira-planner-v1', payload: immutableStateOrJson },
    window.location.origin
  );
*/
