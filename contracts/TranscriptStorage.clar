(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-STUDENT u101)
(define-constant ERR-INVALID-ISSUER u102)
(define-constant ERR-INVALID-HASH u103)
(define-constant ERR-INVALID-GPA u104)
(define-constant ERR-INVALID-COURSES u105)
(define-constant ERR-TRANSCRIPT-ALREADY-EXISTS u106)
(define-constant ERR-TRANSCRIPT-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-ISSUER-NOT-VERIFIED u109)
(define-constant ERR-INVALID-DEGREE u110)
(define-constant ERR-INVALID-MAJOR u111)
(define-constant ERR-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-TRANSCRIPTS-EXCEEDED u114)
(define-constant ERR-INVALID-INSTITUTION u115)
(define-constant ERR-INVALID-GRADUATION-DATE u116)
(define-constant ERR-INVALID-CREDITS u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-STATUS u119)
(define-constant ERR-INVALID-ID u120)

(define-data-var next-transcript-id uint u0)
(define-data-var max-transcripts uint u1000000)
(define-data-var issuance-fee uint u500)
(define-data-var verifier-contract (optional principal) none)

(define-map transcripts
  uint
  {
    student: principal,
    issuer: principal,
    hash: (buff 32),
    gpa: uint,
    courses: (list 20 (string-utf8 100)),
    timestamp: uint,
    degree: (string-utf8 50),
    major: (string-utf8 50),
    institution: (string-utf8 100),
    graduation-date: uint,
    credits: uint,
    location: (string-utf8 100),
    status: bool
  }
)

(define-map transcripts-by-student
  principal
  (list 10 uint)
)

(define-map transcript-updates
  uint
  {
    update-gpa: uint,
    update-courses: (list 20 (string-utf8 100)),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-transcript (id uint))
  (map-get? transcripts id)
)

(define-read-only (get-transcript-updates (id uint))
  (map-get? transcript-updates id)
)

(define-read-only (get-student-transcripts (student principal))
  (default-to (list) (map-get? transcripts-by-student student))
)

(define-private (validate-student (student principal))
  (if (not (is-eq student 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-INVALID-STUDENT))
)

(define-private (validate-issuer (issuer principal))
  (if (not (is-eq issuer 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-INVALID-ISSUER))
)

(define-private (validate-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-gpa (gpa uint))
  (if (and (>= gpa u0) (<= gpa u400))
      (ok true)
      (err ERR-INVALID-GPA))
)

(define-private (validate-courses (courses (list 20 (string-utf8 100))))
  (if (<= (len courses) u20)
      (ok true)
      (err ERR-INVALID-COURSES))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-degree (degree (string-utf8 50)))
  (if (and (> (len degree) u0) (<= (len degree) u50))
      (ok true)
      (err ERR-INVALID-DEGREE))
)

(define-private (validate-major (major (string-utf8 50)))
  (if (and (> (len major) u0) (<= (len major) u50))
      (ok true)
      (err ERR-INVALID-MAJOR))
)

(define-private (validate-institution (inst (string-utf8 100)))
  (if (and (> (len inst) u0) (<= (len inst) u100))
      (ok true)
      (err ERR-INVALID-INSTITUTION))
)

(define-private (validate-graduation-date (date uint))
  (if (> date u0)
      (ok true)
      (err ERR-INVALID-GRADUATION-DATE))
)

(define-private (validate-credits (credits uint))
  (if (>= credits u0)
      (ok true)
      (err ERR-INVALID-CREDITS))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (<= (len loc) u100)
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-public (set-verifier-contract (contract-principal principal))
  (begin
    (asserts! (is-none (var-get verifier-contract)) (err ERR-ISSUER-NOT-VERIFIED))
    (var-set verifier-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-transcripts (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get verifier-contract)) (err ERR-ISSUER-NOT-VERIFIED))
    (var-set max-transcripts new-max)
    (ok true)
  )
)

(define-public (set-issuance-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get verifier-contract)) (err ERR-ISSUER-NOT-VERIFIED))
    (var-set issuance-fee new-fee)
    (ok true)
  )
)

(define-public (issue-transcript
  (student principal)
  (hash (buff 32))
  (gpa uint)
  (courses (list 20 (string-utf8 100)))
  (degree (string-utf8 50))
  (major (string-utf8 50))
  (institution (string-utf8 100))
  (graduation-date uint)
  (credits uint)
  (location (string-utf8 100))
)
  (let (
        (next-id (var-get next-transcript-id))
        (current-max (var-get max-transcripts))
        (verifier (var-get verifier-contract))
        (student-transcripts (get-student-transcripts student))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-TRANSCRIPTS-EXCEEDED))
    (try! (validate-student student))
    (try! (validate-issuer tx-sender))
    (try! (validate-hash hash))
    (try! (validate-gpa gpa))
    (try! (validate-courses courses))
    (try! (validate-degree degree))
    (try! (validate-major major))
    (try! (validate-institution institution))
    (try! (validate-graduation-date graduation-date))
    (try! (validate-credits credits))
    (try! (validate-location location))
    (let ((verifier-recipient (unwrap! verifier (err ERR-ISSUER-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get issuance-fee) tx-sender verifier-recipient))
    )
    (map-set transcripts next-id
      {
        student: student,
        issuer: tx-sender,
        hash: hash,
        gpa: gpa,
        courses: courses,
        timestamp: block-height,
        degree: degree,
        major: major,
        institution: institution,
        graduation-date: graduation-date,
        credits: credits,
        location: location,
        status: true
      }
    )
    (map-set transcripts-by-student student (append student-transcripts next-id))
    (var-set next-transcript-id (+ next-id u1))
    (print { event: "transcript-issued", id: next-id, student: student })
    (ok next-id)
  )
)

(define-public (update-transcript
  (transcript-id uint)
  (update-gpa uint)
  (update-courses (list 20 (string-utf8 100)))
)
  (let ((transcript (map-get? transcripts transcript-id)))
    (match transcript
      t
        (begin
          (asserts! (is-eq (get issuer t) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-gpa update-gpa))
          (try! (validate-courses update-courses))
          (map-set transcripts transcript-id
            (merge t {
              gpa: update-gpa,
              courses: update-courses,
              timestamp: block-height
            })
          )
          (map-set transcript-updates transcript-id
            {
              update-gpa: update-gpa,
              update-courses: update-courses,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "transcript-updated", id: transcript-id })
          (ok true)
        )
      (err ERR-TRANSCRIPT-NOT-FOUND)
    )
  )
)

(define-public (get-transcript-count)
  (ok (var-get next-transcript-id))
)

(define-public (verify-transcript-hash (id uint) (provided-hash (buff 32)))
  (match (map-get? transcripts id)
    t (ok (is-eq (get hash t) provided-hash))
    (err ERR-TRANSCRIPT-NOT-FOUND)
  )
)