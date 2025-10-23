# 📜 Immutable Transcript Sharing App

Welcome to a revolutionary way for students to control and share their academic records securely on the blockchain! This Web3 project uses the Stacks blockchain and Clarity smart contracts to store immutable transcripts, empowering students to grant selective access for job applications, university transfers, or verifications—solving real-world issues like forgery, slow verification processes, and lack of student ownership over their data.

## ✨ Features

🔒 Immutable storage of academic transcripts via hashes  
👤 Student-controlled access permissions  
🏫 University-issued and verified records  
📩 Secure sharing requests and approvals  
✅ Instant verification by employers or institutions  
🛡️ Audit logs for all access events  
🚫 Revocation of access at any time  
📊 Support for multiple transcripts per student  

## 🛠 How It Works

This project leverages 8 Clarity smart contracts to handle registration, storage, access, and verification in a decentralized manner. Here's a high-level overview:

- **UserRegistry.clar**: Manages registration of students, universities, and verifiers (e.g., employers). Ensures only verified entities can interact.  
- **TranscriptStorage.clar**: Stores transcript hashes, metadata (e.g., GPA, courses), and issuance details immutably.  
- **AccessControl.clar**: Handles granting, revoking, and checking permissions for specific transcripts.  
- **RequestManager.clar**: Facilitates sharing requests from verifiers to students, with approval workflows.  
- **VerificationEngine.clar**: Allows verifiers to confirm transcript authenticity against stored hashes.  
- **AuditLogger.clar**: Records all access events, views, and changes for transparency and compliance.  
- **MultiSigApproval.clar**: Enables multi-signature approvals for transcript issuance (e.g., university admin + department).  
- **TokenUtility.clar**: Optional utility token for small fees on verifications or premium features, ensuring spam prevention.  

**For Students**  
- Register via UserRegistry.clar.  
- Upload your transcript hash and details using TranscriptStorage.clar (issued by your university).  
- Receive a sharing request via RequestManager.clar.  
- Grant access using AccessControl.clar—specify duration or conditions.  
- Revoke anytime and view logs in AuditLogger.clar.  

**For Universities**  
- Register and get verified in UserRegistry.clar.  
- Issue transcripts with MultiSigApproval.clar for added security.  
- Store via TranscriptStorage.clar, signing with your private key.  
- Verify student requests if needed through VerificationEngine.clar.  

**For Verifiers (Employers/Institutions)**  
- Register in UserRegistry.clar.  
- Send a sharing request via RequestManager.clar.  
- Once approved, access and verify the transcript using VerificationEngine.clar.  
- Pay a micro-fee via TokenUtility.clar for verifications to prevent abuse.  

That's it! Students maintain full control, records are tamper-proof, and sharing is seamless and verifiable on the blockchain.