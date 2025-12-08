# DEPLOYMENT CHECKLIST

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 2.0.0 | TBD | Phase 2: Multi-Strategy Intelligence | 🔄 In Progress |
| 1.5.0 | TBD | Pre-Phase 2 Prep (CDP Permission) | ⏳ Planned |
| 1.0.0 | Current | Phase 1: Core Recording/Playback | ✅ Complete |

---

## Pre-Deployment Checklist

### 1. Code Review ✅
- [ ] All 10 CDP build cards completed
- [ ] TypeScript compiles with zero errors
- [ ] ESLint passes with no warnings
- [ ] Code review approved by 2+ developers
- [ ] No `console.log()` in production code (only `console.error()`)
- [ ] All TODOs resolved or documented

### 2. Testing ✅
- [ ] All unit tests pass (npm test)
- [ ] Integration tests pass
- [ ] Manual test scenarios completed:
  - [ ] Record with CDP locators enabled
  - [ ] Playback with CDP fallback chain
  - [ ] Vision Engine activates when needed
  - [ ] Time delays work correctly
  - [ ] CSV loop processes all rows
  - [ ] Conditional clicks evaluate correctly
- [ ] Cross-browser testing (Chrome 110+, Edge 110+)
- [ ] Performance benchmarks met:
  - [ ] CDP attach < 200ms
  - [ ] getByRole < 50ms
  - [ ] getByText < 100ms
  - [ ] Vision OCR < 2s

### 3. Database Migration ✅
- [ ] Migration script tested on dev database
- [ ] Migration script tested on staging database
- [ ] Rollback script tested and verified
- [ ] Backup of current database schema created
- [ ] Data integrity checks pass
- [ ] IndexedDB schema version incremented to v3

### 4. Build ✅
- [ ] `npm run build` completes successfully
- [ ] No webpack errors or warnings
- [ ] Bundle size within limits:
  - [ ] background.js < 500KB
  - [ ] contentScript.js < 300KB
  - [ ] popup.js < 200KB
- [ ] Source maps generated (development build only)
- [ ] Manifest.json updated with correct version

### 5. Documentation ✅
- [ ] README.md updated with Phase 2 features
- [ ] API documentation updated
- [ ] User guide updated with new UI elements
- [ ] Migration guide created for users upgrading from v1
- [ ] Knowledge base files uploaded to Claude

### 6. Chrome Web Store Assets ✅
- [ ] Screenshots updated (5 required)
- [ ] Store description updated
- [ ] Privacy policy reviewed
- [ ] Promotional images prepared (1280x800, 440x280)
- [ ] Release notes written

---

## Deployment Steps

### Stage 1: Internal Release (Alpha)
**Target:** Development team only  
**Duration:** 3-5 days

1. **Build Release Candidate**
   ```powershell
   npm run build
   npm run test
   ```

2. **Create Release Package**
   ```powershell
   cd release
   Compress-Archive -Path * -DestinationPath muffin-lite-v2.0.0-rc1.zip
   ```

3. **Load Unpacked Extension**
   - Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `release/` folder

4. **Internal Testing**
   - [ ] All team members install RC1
   - [ ] Run through 10 test scenarios
   - [ ] Log bugs in issue tracker
   - [ ] Performance telemetry collected

5. **Bug Fix Cycle**
   - [ ] Critical bugs fixed
   - [ ] Build RC2 if needed
   - [ ] Repeat testing until stable

### Stage 2: Beta Release
**Target:** 10-20 trusted users  
**Duration:** 1-2 weeks

1. **Create Beta Build**
   ```powershell
   npm run build
   cd release
   Compress-Archive -Path * -DestinationPath muffin-lite-v2.0.0-beta.zip
   ```

2. **Distribute to Beta Testers**
   - Email beta testers with installation instructions
   - Include feedback form link
   - Set up weekly sync calls

3. **Monitor Telemetry**
   - [ ] Check error logs daily
   - [ ] Review performance metrics
   - [ ] Analyze CDP success rates
   - [ ] Vision Engine usage patterns

4. **Collect Feedback**
   - [ ] Beta feedback form completed by all testers
   - [ ] User interviews conducted (5+ users)
   - [ ] Feature requests logged

5. **Polish & Fixes**
   - [ ] Address all critical feedback
   - [ ] Fix all P0/P1 bugs
   - [ ] Improve UX based on feedback

### Stage 3: Production Release
**Target:** All users (Chrome Web Store)  
**Duration:** 1 day

1. **Final Build**
   ```powershell
   npm run build
   cd release
   Compress-Archive -Path * -DestinationPath muffin-lite-v2.0.0.zip
   ```

2. **Chrome Web Store Upload**
   - Log in to Chrome Developer Dashboard
   - Navigate to Muffin Lite listing
   - Click "Upload New Package"
   - Upload `muffin-lite-v2.0.0.zip`
   - Update store listing:
     - Version: 2.0.0
     - Description: Phase 2 features
     - Screenshots: Updated images
     - Release notes: Paste from `RELEASE_NOTES.md`

3. **Submit for Review**
   - Click "Submit for Review"
   - Expected review time: 1-3 days
   - Monitor dashboard for rejection notices

4. **Post-Approval Actions**
   - [ ] Verify extension appears in store
   - [ ] Test installation from store link
   - [ ] Monitor user reviews (first 24 hours critical)
   - [ ] Respond to reviews within 48 hours

5. **Announce Launch**
   - [ ] Twitter/X announcement
   - [ ] Product Hunt launch (optional)
   - [ ] Email existing users (if mailing list exists)
   - [ ] Update website/landing page

---

## Post-Deployment Monitoring

### Day 1 (Launch Day)
- [ ] Monitor error logs every 2 hours
- [ ] Check Chrome Web Store reviews
- [ ] Verify telemetry data flowing correctly
- [ ] Respond to critical bugs immediately

**Metrics to Watch:**
- Install count
- Active users
- Error rate (should be < 1%)
- CDP attach success rate (should be > 98%)
- Vision Engine activation rate

### Week 1
- [ ] Daily review of error logs
- [ ] Daily review of user feedback
- [ ] Weekly analytics report
- [ ] Hot-fix release if critical bugs found

**Success Criteria:**
- Error rate < 1%
- User satisfaction (reviews) > 4.0 stars
- No critical bugs reported

### Month 1
- [ ] Weekly analytics review
- [ ] Monthly user survey
- [ ] Plan Phase 3 based on feedback

---

## Rollback Procedures

### Scenario 1: Critical Bug Discovered (P0)
**Examples:** Data loss, extension crash loop, security vulnerability

**Actions:**
1. **Immediate Response (< 1 hour)**
   - Post notice in Chrome Web Store description
   - Update status page (if exists)
   - Notify users via X/Twitter

2. **Rollback Execution (< 2 hours)**
   ```powershell
   # Revert to v1.0.0 build
   cd release
   Compress-Archive -Path backup/v1.0.0/* -DestinationPath rollback-v1.0.0.zip
   ```
   - Upload `rollback-v1.0.0.zip` to Chrome Web Store
   - Mark as urgent update
   - Submit for expedited review

3. **Post-Rollback**
   - [ ] Root cause analysis within 24 hours
   - [ ] Fix critical bug
   - [ ] Re-test thoroughly
   - [ ] Schedule new deployment

### Scenario 2: Database Migration Failure
**Example:** IndexedDB v3 upgrade corrupts user data

**Actions:**
1. **Data Recovery**
   ```typescript
   // Auto-rollback logic in migration code
   async function rollbackMigration() {
     const backup = await db.get('migration_backup_v2');
     await db.clear();
     await db.bulkPut(backup);
     console.error('[Migration] Rolled back to v2 due to error');
   }
   ```

2. **User Communication**
   - Display in-extension notification
   - Explain data is safe (rolled back)
   - Provide manual export option

3. **Fix & Retry**
   - [ ] Debug migration script
   - [ ] Test on 10+ sample databases
   - [ ] Release hotfix with corrected migration

### Scenario 3: Performance Regression
**Example:** CDP locators causing 5s delays

**Actions:**
1. **Immediate Mitigation**
   - Deploy hotfix with CDP locators disabled (feature flag)
   - Revert to Phase 1 behavior temporarily

2. **Root Cause Analysis**
   - [ ] Profile CDP attach/detach cycles
   - [ ] Check for memory leaks
   - [ ] Review accessibility tree query performance

3. **Optimized Release**
   - [ ] Implement caching layer
   - [ ] Add connection pooling
   - [ ] Re-enable CDP with performance fixes

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Lead Developer | TBD | TBD |
| DevOps | TBD | TBD |
| Product Owner | TBD | TBD |
| Chrome Web Store Account Owner | TBD | TBD |

---

## Success Metrics (30 Days Post-Launch)

| Metric | Target | Actual |
|--------|--------|--------|
| Active Users | 1,000+ | TBD |
| Error Rate | < 1% | TBD |
| CDP Success Rate | > 95% | TBD |
| Vision Fallback Rate | < 10% | TBD |
| User Rating | > 4.0★ | TBD |
| Crash-Free Sessions | > 99% | TBD |

---

## Lessons Learned (Post-Mortem)

**To be completed after launch:**

### What Went Well
- TBD

### What Could Be Improved
- TBD

### Action Items for Phase 3
- TBD
