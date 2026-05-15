import { NextRequest } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function buildDatetimeFromHHMM(hhMM: string): string {
  const [h, m] = hhMM.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("audio") as File | null;

  if (!file) {
    return Response.json({ error: "오디오 파일이 없습니다." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mimeType = file.type || "audio/webm";
  const apiKey = process.env.GEMINI_API_KEY ?? "";

  const prompt = `이 오디오를 분석하여 반드시 아래 형식의 JSON만 반환하세요. 설명이나 마크다운 없이 JSON만 출력하세요.

{
  "transcript": "전체 받아쓰기 내용",
  "summary": "카테고리에 맞는 핵심 정보만 담은 짧은 요약 (최대 20자)",
  "category": "feeding | sleep | diaper | bath | medication | other 중 하나",
  "startTime": "HH:MM 형식 또는 null",
  "endTime": "HH:MM 형식 또는 null"
}

카테고리 기준:
- feeding: 수유, 모유, 분유, 이유식, 먹음
- sleep: 수면, 잠, 재움, 깨어남
- diaper: 기저귀, 응가, 소변, 대변, 똥, 오줌,
- bath: 목욕, 씻김
- medication: 약, 해열제, 투약
- other: 그 외

summary 작성 규칙 (카테고리별 예시):
- feeding: 구체적인 양/방법 포함 → "분유 120ml", "모유 수유 15분", "이유식 반공기"
- sleep: 상태 포함 → "낮잠 시작", "수면 2시간", "기상"
- diaper: 종류 포함 → "소변 기저귀 교체", "응가 기저귀 교체"
- bath: "목욕"
- medication: 약명/용량 포함 → "해열제 5ml 투여", "감기약 투여"
- other: 핵심 행동만 → "산책 30분", "놀이 1시간"
언급되지 않은 정보는 추측하지 말고 생략하세요.

startTime, endTime은 오디오에서 시작/종료 시간이 언급된 경우에만 "HH:MM" 형식으로 추출하고, 언급이 없으면 null로 반환하세요.`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    return Response.json(
      { error: `Gemini API 오류: ${res.status}`, raw: errData },
      { status: 502 }
    );
  }

  const data = await res.json();
  const rawText = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();

  try {
    const jsonText = rawText.replace(/^```json\n?|\n?```$/g, "").trim();
    const parsed = JSON.parse(jsonText);

    const now = new Date().toISOString();
    const startTime = parsed.startTime
      ? buildDatetimeFromHHMM(parsed.startTime)
      : now;
    const endTime = parsed.endTime
      ? buildDatetimeFromHHMM(parsed.endTime)
      : now;

    return Response.json({
      text: parsed.summary || parsed.transcript || "",
      transcript: parsed.transcript ?? "",
      category: parsed.category ?? null,
      startTime,
      endTime,
      raw: data,
    });
  } catch {
    const now = new Date().toISOString();
    return Response.json({ text: rawText, transcript: rawText, category: null, startTime: now, endTime: now, raw: data });
  }
}
