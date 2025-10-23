import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV, principalCV, buffCV, listCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_STUDENT = 101;
const ERR_INVALID_ISSUER = 102;
const ERR_INVALID_HASH = 103;
const ERR_INVALID_GPA = 104;
const ERR_INVALID_COURSES = 105;
const ERR_TRANSCRIPT_ALREADY_EXISTS = 106;
const ERR_TRANSCRIPT_NOT_FOUND = 107;
const ERR_INVALID_TIMESTAMP = 108;
const ERR_ISSUER_NOT_VERIFIED = 109;
const ERR_INVALID_DEGREE = 110;
const ERR_INVALID_MAJOR = 111;
const ERR_UPDATE_NOT_ALLOWED = 112;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_MAX_TRANSCRIPTS_EXCEEDED = 114;
const ERR_INVALID_INSTITUTION = 115;
const ERR_INVALID_GRADUATION_DATE = 116;
const ERR_INVALID_CREDITS = 117;
const ERR_INVALID_LOCATION = 118;
const ERR_INVALID_STATUS = 119;
const ERR_INVALID_ID = 120;

interface Transcript {
  student: string;
  issuer: string;
  hash: Uint8Array;
  gpa: number;
  courses: string[];
  timestamp: number;
  degree: string;
  major: string;
  institution: string;
  graduationDate: number;
  credits: number;
  location: string;
  status: boolean;
}

interface TranscriptUpdate {
  updateGpa: number;
  updateCourses: string[];
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class TranscriptStorageMock {
  state: {
    nextTranscriptId: number;
    maxTranscripts: number;
    issuanceFee: number;
    verifierContract: string | null;
    transcripts: Map<number, Transcript>;
    transcriptUpdates: Map<number, TranscriptUpdate>;
    transcriptsByStudent: Map<string, number[]>;
  } = {
    nextTranscriptId: 0,
    maxTranscripts: 1000000,
    issuanceFee: 500,
    verifierContract: null,
    transcripts: new Map(),
    transcriptUpdates: new Map(),
    transcriptsByStudent: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1STUDENT";
  issuers: Set<string> = new Set(["ST1ISSUER"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextTranscriptId: 0,
      maxTranscripts: 1000000,
      issuanceFee: 500,
      verifierContract: null,
      transcripts: new Map(),
      transcriptUpdates: new Map(),
      transcriptsByStudent: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1STUDENT";
    this.issuers = new Set(["ST1ISSUER"]);
    this.stxTransfers = [];
  }

  setVerifierContract(contractPrincipal: string): Result<boolean> {
    if (this.state.verifierContract !== null) {
      return { ok: false, value: ERR_ISSUER_NOT_VERIFIED };
    }
    this.state.verifierContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setIssuanceFee(newFee: number): Result<boolean> {
    if (!this.state.verifierContract) return { ok: false, value: ERR_ISSUER_NOT_VERIFIED };
    this.state.issuanceFee = newFee;
    return { ok: true, value: true };
  }

  issueTranscript(
    student: string,
    hash: Uint8Array,
    gpa: number,
    courses: string[],
    degree: string,
    major: string,
    institution: string,
    graduationDate: number,
    credits: number,
    location: string
  ): Result<number> {
    if (this.state.nextTranscriptId >= this.state.maxTranscripts) return { ok: false, value: ERR_MAX_TRANSCRIPTS_EXCEEDED };
    if (student === "SP000000000000000000002Q6VF78") return { ok: false, value: ERR_INVALID_STUDENT };
    if (!this.issuers.has(this.caller)) return { ok: false, value: ERR_INVALID_ISSUER };
    if (hash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (gpa < 0 || gpa > 400) return { ok: false, value: ERR_INVALID_GPA };
    if (courses.length > 20) return { ok: false, value: ERR_INVALID_COURSES };
    if (!degree || degree.length > 50) return { ok: false, value: ERR_INVALID_DEGREE };
    if (!major || major.length > 50) return { ok: false, value: ERR_INVALID_MAJOR };
    if (!institution || institution.length > 100) return { ok: false, value: ERR_INVALID_INSTITUTION };
    if (graduationDate <= 0) return { ok: false, value: ERR_INVALID_GRADUATION_DATE };
    if (credits < 0) return { ok: false, value: ERR_INVALID_CREDITS };
    if (location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!this.state.verifierContract) return { ok: false, value: ERR_ISSUER_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.issuanceFee, from: this.caller, to: this.state.verifierContract });

    const id = this.state.nextTranscriptId;
    const transcript: Transcript = {
      student,
      issuer: this.caller,
      hash,
      gpa,
      courses,
      timestamp: this.blockHeight,
      degree,
      major,
      institution,
      graduationDate,
      credits,
      location,
      status: true,
    };
    this.state.transcripts.set(id, transcript);
    const studentTranscripts = this.state.transcriptsByStudent.get(student) || [];
    this.state.transcriptsByStudent.set(student, [...studentTranscripts, id]);
    this.state.nextTranscriptId++;
    return { ok: true, value: id };
  }

  getTranscript(id: number): Transcript | null {
    return this.state.transcripts.get(id) || null;
  }

  updateTranscript(id: number, updateGpa: number, updateCourses: string[]): Result<boolean> {
    const transcript = this.state.transcripts.get(id);
    if (!transcript) return { ok: false, value: ERR_TRANSCRIPT_NOT_FOUND };
    if (transcript.issuer !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (updateGpa < 0 || updateGpa > 400) return { ok: false, value: ERR_INVALID_GPA };
    if (updateCourses.length > 20) return { ok: false, value: ERR_INVALID_COURSES };

    const updated: Transcript = {
      ...transcript,
      gpa: updateGpa,
      courses: updateCourses,
      timestamp: this.blockHeight,
    };
    this.state.transcripts.set(id, updated);
    this.state.transcriptUpdates.set(id, {
      updateGpa,
      updateCourses,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getTranscriptCount(): Result<number> {
    return { ok: true, value: this.state.nextTranscriptId };
  }

  verifyTranscriptHash(id: number, providedHash: Uint8Array): Result<boolean> {
    const transcript = this.state.transcripts.get(id);
    if (!transcript) return { ok: false, value: ERR_TRANSCRIPT_NOT_FOUND };
    return { ok: true, value: transcript.hash.every((byte, i) => byte === providedHash[i]) };
  }

  getStudentTranscripts(student: string): number[] {
    return this.state.transcriptsByStudent.get(student) || [];
  }
}

describe("TranscriptStorage", () => {
  let contract: TranscriptStorageMock;

  beforeEach(() => {
    contract = new TranscriptStorageMock();
    contract.reset();
    contract.caller = "ST1ISSUER";
  });

  it("issues a transcript successfully", () => {
    contract.setVerifierContract("ST2VERIFIER");
    const hash = new Uint8Array(32).fill(1);
    const courses = ["Math", "Science"];
    const result = contract.issueTranscript(
      "ST1STUDENT",
      hash,
      350,
      courses,
      "Bachelor",
      "Computer Science",
      "UniversityX",
      20230101,
      120,
      "CityZ"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const transcript = contract.getTranscript(0);
    expect(transcript?.student).toBe("ST1STUDENT");
    expect(transcript?.issuer).toBe("ST1ISSUER");
    expect(transcript?.gpa).toBe(350);
    expect(transcript?.courses).toEqual(courses);
    expect(transcript?.degree).toBe("Bachelor");
    expect(transcript?.major).toBe("Computer Science");
    expect(transcript?.institution).toBe("UniversityX");
    expect(transcript?.graduationDate).toBe(20230101);
    expect(transcript?.credits).toBe(120);
    expect(transcript?.location).toBe("CityZ");
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1ISSUER", to: "ST2VERIFIER" }]);
  });

  it("rejects issuance without verifier contract", () => {
    const hash = new Uint8Array(32).fill(1);
    const result = contract.issueTranscript(
      "ST1STUDENT",
      hash,
      350,
      ["Math"],
      "Bachelor",
      "CS",
      "UniX",
      20230101,
      120,
      "CityZ"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ISSUER_NOT_VERIFIED);
  });

  it("rejects invalid gpa", () => {
    contract.setVerifierContract("ST2VERIFIER");
    const hash = new Uint8Array(32).fill(1);
    const result = contract.issueTranscript(
      "ST1STUDENT",
      hash,
      500,
      ["Math"],
      "Bachelor",
      "CS",
      "UniX",
      20230101,
      120,
      "CityZ"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_GPA);
  });

  it("updates a transcript successfully", () => {
    contract.setVerifierContract("ST2VERIFIER");
    const hash = new Uint8Array(32).fill(1);
    contract.issueTranscript(
      "ST1STUDENT",
      hash,
      350,
      ["Math", "Science"],
      "Bachelor",
      "CS",
      "UniX",
      20230101,
      120,
      "CityZ"
    );
    const result = contract.updateTranscript(0, 375, ["Math", "Physics"]);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const transcript = contract.getTranscript(0);
    expect(transcript?.gpa).toBe(375);
    expect(transcript?.courses).toEqual(["Math", "Physics"]);
    const update = contract.state.transcriptUpdates.get(0);
    expect(update?.updateGpa).toBe(375);
    expect(update?.updateCourses).toEqual(["Math", "Physics"]);
    expect(update?.updater).toBe("ST1ISSUER");
  });

  it("rejects update by non-issuer", () => {
    contract.setVerifierContract("ST2VERIFIER");
    const hash = new Uint8Array(32).fill(1);
    contract.issueTranscript(
      "ST1STUDENT",
      hash,
      350,
      ["Math"],
      "Bachelor",
      "CS",
      "UniX",
      20230101,
      120,
      "CityZ"
    );
    contract.caller = "ST2FAKE";
    const result = contract.updateTranscript(0, 375, ["Physics"]);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("verifies transcript hash correctly", () => {
    contract.setVerifierContract("ST2VERIFIER");
    const hash = new Uint8Array(32).fill(1);
    contract.issueTranscript(
      "ST1STUDENT",
      hash,
      350,
      ["Math"],
      "Bachelor",
      "CS",
      "UniX",
      20230101,
      120,
      "CityZ"
    );
    const result = contract.verifyTranscriptHash(0, hash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const wrongHash = new Uint8Array(32).fill(2);
    const result2 = contract.verifyTranscriptHash(0, wrongHash);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("returns correct transcript count", () => {
    contract.setVerifierContract("ST2VERIFIER");
    const hash = new Uint8Array(32).fill(1);
    contract.issueTranscript(
      "ST1STUDENT",
      hash,
      350,
      ["Math"],
      "Bachelor",
      "CS",
      "UniX",
      20230101,
      120,
      "CityZ"
    );
    contract.issueTranscript(
      "ST2STUDENT",
      hash,
      375,
      ["Physics"],
      "Master",
      "EE",
      "UniY",
      20240101,
      60,
      "CityW"
    );
    const result = contract.getTranscriptCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("gets student transcripts correctly", () => {
    contract.setVerifierContract("ST2VERIFIER");
    const hash = new Uint8Array(32).fill(1);
    contract.issueTranscript(
      "ST1STUDENT",
      hash,
      350,
      ["Math"],
      "Bachelor",
      "CS",
      "UniX",
      20230101,
      120,
      "CityZ"
    );
    contract.issueTranscript(
      "ST1STUDENT",
      hash,
      375,
      ["Physics"],
      "Master",
      "EE",
      "UniY",
      20240101,
      60,
      "CityW"
    );
    const transcripts = contract.getStudentTranscripts("ST1STUDENT");
    expect(transcripts).toEqual([0, 1]);
    const transcripts2 = contract.getStudentTranscripts("ST3STUDENT");
    expect(transcripts2).toEqual([]);
  });

  it("rejects issuance with max transcripts exceeded", () => {
    contract.setVerifierContract("ST2VERIFIER");
    contract.state.maxTranscripts = 1;
    const hash = new Uint8Array(32).fill(1);
    contract.issueTranscript(
      "ST1STUDENT",
      hash,
      350,
      ["Math"],
      "Bachelor",
      "CS",
      "UniX",
      20230101,
      120,
      "CityZ"
    );
    const result = contract.issueTranscript(
      "ST2STUDENT",
      hash,
      375,
      ["Physics"],
      "Master",
      "EE",
      "UniY",
      20240101,
      60,
      "CityW"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_TRANSCRIPTS_EXCEEDED);
  });

  it("sets issuance fee successfully", () => {
    contract.setVerifierContract("ST2VERIFIER");
    const result = contract.setIssuanceFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.issuanceFee).toBe(1000);
    const hash = new Uint8Array(32).fill(1);
    contract.issueTranscript(
      "ST1STUDENT",
      hash,
      350,
      ["Math"],
      "Bachelor",
      "CS",
      "UniX",
      20230101,
      120,
      "CityZ"
    );
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1ISSUER", to: "ST2VERIFIER" }]);
  });
});