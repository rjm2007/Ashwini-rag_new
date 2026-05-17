"use client";

import { useEffect, useState } from "react";
import api from "../../../../lib/api";

export default function ReviewDetailPage({ params }: { params: { id: string } }) {
  const [document, setDocument] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    // This function loads document and review workflow state for action screen.
    Promise.all([api.get(`/documents/${params.id}`), api.get(`/review/${params.id}/state`)])
      .then(([docResponse, stateResponse]) => {
        setDocument(docResponse.data);
        setState(stateResponse.data);
      })
      .catch(() => {
        setDocument(null);
        setState(null);
      });
  }, [params.id]);

  const approveReviewer = async () => {
    // This function submits reviewer approval and refreshes action state.
    setBusy(true);
    setMessage("");
    try {
      await api.post(`/review/${params.id}/reviewer-approve`, { comment: "Looks good." });
      const [docResponse, stateResponse] = await Promise.all([
        api.get(`/documents/${params.id}`),
        api.get(`/review/${params.id}/state`)
      ]);
      setDocument(docResponse.data);
      setState(stateResponse.data);
      setMessage("Reviewer approval saved.");
    } finally {
      setBusy(false);
    }
  };

  const approveAdmin = async () => {
    // This function submits admin final approval and refreshes action state.
    setBusy(true);
    setMessage("");
    try {
      await api.post(`/review/${params.id}/admin-approve`, { comment: "Certified." });
      const [docResponse, stateResponse] = await Promise.all([
        api.get(`/documents/${params.id}`),
        api.get(`/review/${params.id}/state`)
      ]);
      setDocument(docResponse.data);
      setState(stateResponse.data);
      setMessage("Admin approval saved.");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    // This function rejects a document from review workflow.
    setBusy(true);
    setMessage("");
    try {
      await api.post(`/review/${params.id}/reject`, { reason: "Missing coverage details." });
      const [docResponse, stateResponse] = await Promise.all([
        api.get(`/documents/${params.id}`),
        api.get(`/review/${params.id}/state`)
      ]);
      setDocument(docResponse.data);
      setState(stateResponse.data);
      setMessage("Document rejected.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="rounded bg-white p-4 shadow">
      <h1 className="mb-2 text-xl font-semibold">Review Document</h1>
      {state ? (
        <p className="mb-2 text-sm text-gray-700">
          repository=<strong>{state.currentRepository}</strong> | finalStatus=
          <strong>{state.finalStatus}</strong>
        </p>
      ) : null}
      {message ? <p className="mb-2 text-sm text-green-700">{message}</p> : null}
      <pre className="mb-4 text-sm">{JSON.stringify(document, null, 2)}</pre>
      <div className="flex gap-2">
        <button
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={approveReviewer}
          disabled={busy || !state?.canReviewerApprove}
        >
          Reviewer Approve
        </button>
        <button
          className="rounded bg-green-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={approveAdmin}
          disabled={busy || !state?.canAdminApprove}
        >
          Admin Approve
        </button>
        <button
          className="rounded bg-red-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={reject}
          disabled={busy || !state?.canReject}
        >
          Reject
        </button>
      </div>
    </main>
  );
}
