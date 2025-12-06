# Schema Migration System Breakdown

## Purpose

Migrates legacy recordings (schema v1) to Vision-compatible format (schema v3). Adds defaults for recordedVia, loopStartIndex, globalDelayMs, conditionalConfig, and delaySeconds. Verifies backward compatibility.

## Key Files

| File | Location | Purpose |
|------|----------|----------|
| Schema Migration | `src/lib/schemaMigration.ts` | Main migration orchestrator |
| RecordedVia Migration | `src/lib/migrations/migrateRecordedVia.ts` | Adds 'dom' default |
| LoopStartIndex Migration | `src/lib/migrations/migrateLoopStartIndex.ts` | Adds 0 default |
| GlobalDelayMs Migration | `src/lib/migrations/migrateGlobalDelay.ts` | Adds 0 default |
| Conditional Defaults | `src/lib/migrations/migrateConditionalDefaults.ts` | Adds null defaults |
| Compatibility Verification | `src/lib/migrations/verifyBackwardCompatibility.ts` | Validates migrations |

## Inputs

| Input | Type | Source | Purpose |
|-------|------|--------|----------|
| recording | `Recording` | IndexedDB | Legacy recording |
| currentSchema | `number` | Recording | Schema version |

## Outputs

| Output | Type | Destination | Content |
|--------|------|-------------|----------|
| migratedRecording | `Recording` | IndexedDB | Updated recording |
| compatibilityReport | `CompatibilityReport` | Logger | Verification results |

## Internal Architecture

### Migration Pipeline

```typescript
function migrateRecording(recording: Recording): Recording {
  let migrated = { ...recording };
  
  // Stage 1: Add defaults
  migrated = migrateRecordedVia(migrated);        // MIG-001
  migrated = migrateLoopStartIndex(migrated);     // MIG-002
  migrated = migrateGlobalDelayMs(migrated);      // MIG-003
  migrated = migrateConditionalDefaults(migrated); // MIG-004
  
  // Stage 2: Repair invalid values
  migrated = repairLoopStartIndex(migrated);
  migrated = repairGlobalDelayMs(migrated);
  migrated = repairConditionalDefaults(migrated);
  
  // Stage 3: Update schema version
  migrated.schemaVersion = 3;
  
  // Stage 4: Verify compatibility
  const report = verifyBackwardCompatibility(recording, migrated); // MIG-005
  if (!report.compatible && isDevelopment) {
    console.warn('Migration compatibility issues:', report);
  }
  
  return migrated;
}
```

### Migration Functions

**migrateRecordedVia(recording)** (MIG-001)
- Iterates all steps
- If step.recordedVia === undefined, sets to 'dom'
- Returns updated recording
- Rationale: All legacy steps used DOM

**migrateLoopStartIndex(recording)** (MIG-002)
- If recording.loopStartIndex === undefined, sets to 0
- Returns updated recording
- Rationale: Original behavior was all steps for all rows

**migrateGlobalDelayMs(recording)** (MIG-003)
- If recording.globalDelayMs === undefined, sets to 0
- Returns updated recording
- Rationale: Original behavior was no delays

**migrateConditionalDefaults(recording)** (MIG-004)
- Iterates all steps
- If step.conditionalConfig === undefined, sets to null
- If step.delaySeconds === undefined, sets to null
- Returns updated recording
- Rationale: Features disabled by default

### Repair Functions

**repairLoopStartIndex(recording)**
- Validates: 0 <= loopStartIndex <= steps.length
- If negative, sets to 0
- If exceeds length, sets to steps.length - 1
- Returns repaired recording

**repairGlobalDelayMs(recording)**
- Validates: 0 <= globalDelayMs <= 60000
- If negative, sets to 0
- If exceeds 60000, sets to 60000
- Returns repaired recording

**repairConditionalDefaults(recording)**
- Validates conditionalConfig structure
- If invalid, sets to null
- Validates delaySeconds: 0 <= delay <= 3600
- If invalid, sets to null or caps
- Returns repaired recording

### Compatibility Verification

**verifyBackwardCompatibility(original, migrated)** (MIG-005)
- Compares critical fields (id, name, url, createdAt, steps)
- Checks steps count unchanged
- Checks step IDs preserved
- Checks new fields present
- Checks playability (DOM steps have path, Vision steps have target)
- Returns CompatibilityReport with issues array

## Dependencies

### Type Dependencies
- **Recording** (FND-011): Recording interface
- **Step** (FND-010): Step interface
- **ConditionalConfig** (FND-008): Conditional config
- **CompatibilityReport**: Verification result type

### Internal Dependencies
- **StorageService** (DAT-003): Loads/saves recordings
- **PlaybackEngine** (ENG-008): Uses migrated recordings

## Hidden Assumptions

1. **Schema Version 1**: Original recordings have no schemaVersion or schemaVersion=1
2. **Idempotency**: Running migration twice has no effect
3. **Immutability**: Original recording not modified
4. **Default Preservation**: All defaults preserve original behavior
5. **Field Order**: Order doesn't matter for compatibility
6. **Step IDs**: Must be preserved
7. **Development Mode**: Warnings only logged in dev
8. **Automatic Migration**: Happens on load, not on save

## Stability Concerns

### High Risk
1. **Data Loss**: Bug in migration could corrupt recordings
2. **Playback Breakage**: Wrong defaults break existing recordings

### Medium Risk
1. **Performance**: Large recordings take time to migrate
2. **Verification False Positives**: Harmless changes flagged as issues

### Low Risk
1. **Schema Version**: Simple integer comparison
2. **Default Values**: Well-tested constants

## Edge Cases

1. **No Schema Version**: Treats as v1
2. **Future Schema**: Skips migration if schemaVersion > 3
3. **Empty Steps**: Migration works on []
4. **Partial Migration**: If crash mid-migration, may have invalid state
5. **Negative LoopStart**: Repaired to 0
6. **Huge Delay**: Capped to 60000ms
7. **Invalid ConditionalConfig**: Reset to null
8. **Missing Step Fields**: Migration adds them
9. **Extra Fields**: Preserved unchanged
10. **Null vs Undefined**: Treated differently (undefined triggers migration)

## Developer Notes

### Testing Strategy
- **Unit Tests** (MIG-001 to MIG-004): Each migration function
- **Integration Tests** (MIG-005): Compatibility verification
- **E2E Tests** (TST-008): Full migration pipeline

### Common Pitfalls
1. **Forgetting Immutability**: Use spread operators
2. **Wrong Default**: Must match original behavior
3. **Skipping Repair**: Invalid values break playback
4. **Missing Verification**: Silent corruption
5. **Mutating Original**: Corrupts IndexedDB

### Integration Points
- **StorageService.loadRecording()**: Calls migrateRecording (DAT-003)
- **PlaybackEngine**: Uses migrated recordings (ENG-008)
- **IndexedDB Schema**: Stores schemaVersion (DAT-001)

### Migration Checklist
- [ ] Add default value
- [ ] Write validation function
- [ ] Write repair function
- [ ] Add compatibility check
- [ ] Update schemaVersion
- [ ] Test with legacy recordings
- [ ] Test idempotency
- [ ] Test repair edge cases

## Specification References

- MIG-001: RecordedVia default migration
- MIG-002: LoopStartIndex default migration
- MIG-003: GlobalDelayMs default migration
- MIG-004: Conditional defaults migration
- MIG-005: Backward compatibility verification
- DAT-001: IndexedDB schema v2
- DAT-002: Schema migration logic
- DAT-003: Recording repository
- TST-008: Schema migration tests
- FND-010: Step interface extension
- FND-011: Recording interface extension
