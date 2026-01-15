# Unwanted Files Documentation

This document lists all unwanted files and directories that should be excluded from version control and deployment in the Squares application.

## Table of Contents
- [Frontend-Specific Unwanted Files](#frontend-specific-unwanted-files)
- [Build Artifacts](#build-artifacts)
- [Dependencies](#dependencies)
- [Environment Files](#environment-files)
- [Documentation Files](#documentation-files)
- [Log Files](#log-files)
- [Editor & IDE Files](#editor--ide-files)
- [Operating System Files](#operating-system-files)
- [Test & Debug Files](#test--debug-files)
- [Temporary & Cache Files](#temporary--cache-files)
- [Database Exports](#database-exports)
- [Miscellaneous Files](#miscellaneous-files)

---

## Frontend-Specific Unwanted Files

### Backup & Old Component Files
Located in `src/components/`:
- **`PasswordChangeDialog_backup.tsx`** (25,055 bytes)
  - Backup version of password change dialog
  - Original: `PasswordChangeDialog.tsx` (18,895 bytes)
  - **Action**: Safe to delete

- **`PasswordChangeDialog_clean.tsx`** (18,895 bytes)
  - Duplicate "clean" version
  - Identical to current `PasswordChangeDialog.tsx`
  - **Action**: Safe to delete

- **`ThemeToggle-old.tsx`** (998 bytes)
  - Old version of theme toggle component
  - Current version: `ThemeToggle.tsx` (3,236 bytes)
  - **Action**: Safe to delete

### Backup Page Files
Located in `src/pages/customer/`:
- **`Messages_backup.tsx`** (18 bytes)
  - Nearly empty backup file
  - Current: `Messages.tsx` (413 bytes)
  - **Action**: Safe to delete

### Test/Debug Pages
Located in `src/pages/customer/`:
- **`PasswordTest.tsx`** (11,656 bytes)
  - Testing component for password functionality
  - Should not be in production
  - **Action**: Move to test directory or delete

### Large JSON Data Files
Located in `public/`:
- **`5c2f62fe-5afa-4119-a499-fec9d604d5bd.json`** (76.28 MB) ⚠️
  - **CRITICAL**: Extremely large file (76MB!)
  - Unknown purpose - appears to be a UUID-named data dump
  - Significantly increases bundle size
  - **Action**: Investigate and remove if not essential

- **`loca.json`** (21.11 MB) ⚠️
  - **CRITICAL**: Very large location data file
  - Should be loaded from API or database
  - **Action**: Move to backend or use API endpoint

Located in `src/services/`:
- **`location.sample.json`** (76.28 MB) ⚠️
  - **CRITICAL**: Duplicate of the public JSON file
  - Sample/test data that shouldn't be in production
  - **Action**: Delete immediately

- **`location.json`** (115,848 bytes / ~113 KB)
  - Location data in services directory
  - Consider moving to API or reducing size
  - **Action**: Review if needed in frontend

### Empty/Placeholder Service Files
Located in `src/services/`:
- **`courseService.ts`** (empty)
  - Empty service file
  - **Action**: Delete if not planned for use

- **`pdfExportService.ts`** (empty)
  - Empty service file
  - **Action**: Delete or implement if needed

- **`pdfUtils.ts`** (empty)
  - Empty utility file
  - **Action**: Delete or implement if needed

- **`superAdminPDFService.ts`** (empty)
  - Empty service file
  - **Action**: Delete or implement if needed

### Empty Hook Files
Located in `src/hooks/`:
- **`usePermissionManager.ts`** (empty)
  - Empty hook file
  - **Action**: Delete or implement if needed

- **`useRolePageSync.ts`** (empty)
  - Empty hook file
  - **Action**: Delete or implement if needed

- **`useRolePagesWebSocket.ts`** (empty)
  - Empty hook file
  - **Action**: Delete or implement if needed

- **`useUniversalNavigation.ts`** (empty)
  - Empty hook file
  - **Action**: Delete or implement if needed

### Duplicate Assets
Located in `src/assets/`:
- **`commercial.jpg`** (1.34 MB)
- **`commercial.png`** (2.17 MB)
  - Same image in two formats
  - **Action**: Keep one format (prefer WebP or optimized PNG)

- **`logo.png`** (76,119 bytes)
- **`logo-dark.png`** (104,627 bytes)
- **`logo-light.png`** (106,904 bytes)
  - Multiple logo versions
  - **Action**: Review if all three are needed

### Large Unoptimized Images
Located in `src/assets/`:
- **`Sell.jpg`** (4.67 MB) ⚠️
- **`Lease.jpg`** (3.77 MB) ⚠️
- **`Rent.jpg`** (2.82 MB) ⚠️
- **`Buy.jpg`** (787 KB)
- **`signup-hero.jpg`** (995 KB)
- **`reg-pg.png`** (826 KB)
  - **Action**: Optimize/compress these images
  - Recommended: Convert to WebP format
  - Target size: < 200KB per image

### Duplicate Public Assets
Located in `public/`:
- **`gsap/`** directory (95 files)
  - Duplicate of `gsap-public/` in root
  - **Action**: Remove one copy, use npm package instead

- **`favicon.ico`** (104,627 bytes)
- **`favicon.png`** (104,627 bytes)
  - Same favicon in two formats
  - **Action**: Keep .ico for browser compatibility

### Audio Files
Located in `public/`:
- **`mixkit-software-interface-start-2574.wav`** (414 KB)
  - Large WAV file for notifications
  - **Action**: Convert to smaller MP3/OGG format

- **`notification-sound.mp3`** (291 bytes)
  - Very small, likely corrupted or placeholder
  - **Action**: Replace with proper audio file or delete

### Frontend File Size Summary

#### Critical Issues (Immediate Action Required)
1. **`5c2f62fe-5afa-4119-a499-fec9d604d5bd.json`** - 76.28 MB
2. **`location.sample.json`** - 76.28 MB
3. **`loca.json`** - 21.11 MB

**Total wasted space from JSON files alone: ~173 MB**

#### High Priority (Should Remove)
1. Backup component files - ~44 KB
2. Old component files - ~1 KB
3. Test pages - ~11 KB
4. Empty service/hook files - 0 bytes (clutter)

#### Medium Priority (Optimize)
1. Unoptimized images - ~13 MB
2. Duplicate assets - ~3 MB
3. Audio files - ~414 KB

### Frontend Cleanup Commands

```bash
# Navigate to project root
cd "/run/media/dheena/Leave you files/Squares-v3"

# Remove backup and old component files
rm -f src/components/PasswordChangeDialog_backup.tsx
rm -f src/components/PasswordChangeDialog_clean.tsx
rm -f src/components/ThemeToggle-old.tsx
rm -f src/pages/customer/Messages_backup.tsx

# Remove test files (review first!)
rm -f src/pages/customer/PasswordTest.tsx

# Remove CRITICAL large JSON files (BACKUP FIRST if needed!)
rm -f public/5c2f62fe-5afa-4119-a499-fec9d604d5bd.json
rm -f public/loca.json
rm -f src/services/location.sample.json

# Remove empty service files
rm -f src/services/courseService.ts
rm -f src/services/pdfExportService.ts
rm -f src/services/pdfUtils.ts
rm -f src/services/superAdminPDFService.ts

# Remove empty hook files
rm -f src/hooks/usePermissionManager.ts
rm -f src/hooks/useRolePageSync.ts
rm -f src/hooks/useRolePagesWebSocket.ts
rm -f src/hooks/useUniversalNavigation.ts

# Remove duplicate GSAP directory (if using npm package)
rm -rf public/gsap

# Optimize images (requires imagemagick or similar)
# Example for converting to WebP:
# for img in src/assets/*.jpg; do
#   cwebp -q 80 "$img" -o "${img%.jpg}.webp"
# done
```

### Recommended .gitignore Additions for Frontend

Add these patterns to `.gitignore`:

```gitignore
# Backup files
*_backup.*
*_old.*
*_clean.*
*-old.*
*.backup
*.bak

# Test files in src
src/**/*test*
src/**/*Test*

# Large data files
*.json.large
location.sample.json
loca.json

# Unoptimized images (if you have optimized versions)
*.unoptimized.*
```

### Frontend Bundle Size Impact

Removing these files will:
- **Reduce repository size by ~173 MB** (mostly JSON files)
- **Improve build times** (fewer files to process)
- **Reduce production bundle size** (if these are being included)
- **Clean up codebase** (remove confusion from duplicate files)

### Image Optimization Recommendations

1. **Convert to WebP format**:
   - Better compression than JPEG/PNG
   - Supported by all modern browsers
   - Can reduce size by 25-35%

2. **Use responsive images**:
   - Generate multiple sizes for different screen sizes
   - Use `srcset` attribute in HTML

3. **Lazy loading**:
   - Implement lazy loading for images below the fold
   - Use `loading="lazy"` attribute

4. **CDN hosting**:
   - Consider moving large images to a CDN
   - Reduces server load and improves performance

---

## Build Artifacts

### Production Build Directory
- **`dist/`** - Production build output directory
  - Contains compiled JavaScript, CSS, and HTML files
  - Generated by Vite during build process
  - Should be regenerated for each deployment

### Server-Side Rendering
- **`dist-ssr/`** - Server-side rendering build artifacts
  - Generated during SSR builds
  - Not needed in version control

### Public Build Directory
- **`gsap-public/`** - GSAP library public files
  - Duplicate of public assets
  - Should be managed through package.json dependencies

---

## Dependencies

### Node Modules
- **`node_modules/`** - NPM package dependencies
  - Contains all installed npm packages
  - Can be regenerated using `npm install` or `bun install`
  - Largest directory in the project (~100MB+)
  - **CRITICAL**: Never commit to version control

### Lock Files (Keep One)
- **`package-lock.json`** - NPM lock file (307KB)
- **`bun.lockb`** - Bun lock file (197KB)
  - **Note**: Choose one package manager and remove the other lock file
  - If using npm, remove `bun.lockb`
  - If using bun, remove `package-lock.json`

---

## Environment Files

### Environment Configuration Files
- **`.env`** - Local environment variables (307 bytes)
  - Contains sensitive API keys, database credentials
  - **CRITICAL**: Never commit to version control
  
- **`.env.production`** - Production environment variables (939 bytes)
  - Production-specific configuration
  - **CRITICAL**: Contains production secrets
  
- **`.env.hostinger`** - Hostinger deployment configuration (888 bytes)
  - Hosting provider specific settings
  - **CRITICAL**: Contains deployment credentials

### Keep Only
- **`.env.example`** - Template for environment variables (615 bytes)
  - Safe to commit - contains no actual secrets
  - Serves as documentation for required variables

---

## Documentation Files

### Markdown Documentation (Currently Ignored)
- **`README.md`** - Project readme (3,151 bytes)
- **`TODO.md`** - Todo list (430 bytes)
- **`BACKEND_MESSAGE_ANALYSIS.md`** - Backend analysis (22,099 bytes)
- **`CONFIGURATION_SYSTEM.md`** - Configuration documentation (13,308 bytes)
- **`DYNAMIC_FILTERS_IMPLEMENTATION.md`** - Filter implementation docs
- **`FILTER_FIX.md`** - Filter fix documentation (6,630 bytes)
- **`MESSAGE_SERVICE_IMPROVEMENTS.md`** - Message service docs (15,401 bytes)
- **`PROPERTY_TYPES_FEATURE.md`** - Property types feature (3,876 bytes)
- **`PROPERTY_TYPES_IMPLEMENTATION.md`** - Implementation guide (7,715 bytes)
- **`PROPERTY_TYPES_QUICK_START.md`** - Quick start guide (5,804 bytes)
- **`PROPERTY_TYPES_SUMMARY.md`** - Feature summary (7,855 bytes)

**Note**: Currently all `.md` files are ignored via `.gitignore`. Consider whether documentation should be version controlled.

---

## Log Files

### Application Logs
- **`logs/`** - Log directory
- **`*.log`** - All log files
- **`npm-debug.log*`** - NPM debug logs
- **`yarn-debug.log*`** - Yarn debug logs
- **`yarn-error.log*`** - Yarn error logs
- **`pnpm-debug.log*`** - PNPM debug logs
- **`lerna-debug.log*`** - Lerna debug logs

---

## Editor & IDE Files

### Visual Studio Code
- **`.vscode/*`** - VS Code settings directory
  - **Exception**: `.vscode/extensions.json` is kept for recommended extensions

### JetBrains IDEs
- **`.idea/`** - IntelliJ IDEA / WebStorm settings

### Other Editors
- **`*.suo`** - Visual Studio user options
- **`*.ntvs*`** - Node.js Tools for Visual Studio
- **`*.njsproj`** - Node.js project files
- **`*.sln`** - Visual Studio solution files
- **`*.sw?`** - Vim swap files

---

## Operating System Files

### macOS
- **`.DS_Store`** - macOS folder metadata
  - Created automatically by Finder
  - Contains view settings and icon positions

### Windows
- **`Thumbs.db`** - Windows thumbnail cache
- **`desktop.ini`** - Windows folder settings

### Linux
- **`.directory`** - KDE directory settings

---

## Test & Debug Files

### Test Scripts
- **`test-*.js`** - Test JavaScript files
- **`test-*.cjs`** - Test CommonJS files
- **`test-*.sh`** - Test shell scripts
- **`*-test.js`** - Alternative test naming
- **`*-test.cjs`** - Alternative test CommonJS
- **`*.test.js`** - Jest/Vitest test files
- **`*.spec.js`** - Spec test files

### Debug Scripts
- **`debug-*.js`** - Debug scripts
- **`check-*.js`** - Check scripts
- **`check-*.cjs`** - Check CommonJS scripts
- **`check-*.sh`** - Check shell scripts

### Migration & Fix Scripts
- **`migrate-*.js`** - Migration scripts
- **`migrate-*.cjs`** - Migration CommonJS scripts
- **`fix-*.js`** - Fix scripts
- **`fix-*.cjs`** - Fix CommonJS scripts
- **`sync-*.js`** - Sync scripts
- **`sync-*.cjs`** - Sync CommonJS scripts

---

## Temporary & Cache Files

### Local Files
- **`*.local`** - Local configuration overrides
  - Vite uses this for local environment variables

### Temporary Files
- **`*.tmp`** - Temporary files
- **`*.temp`** - Temporary files
- **`*.swp`** - Swap files
- **`*.swo`** - Swap files

### Cache Directories
- **`.cache/`** - General cache directory
- **`.parcel-cache/`** - Parcel bundler cache
- **`.next/`** - Next.js cache (if applicable)

---

## Database Exports

### MongoDB Exports
- **`mongo_exports/`** - MongoDB export directory (21 files)
  - Contains database dumps and exports
  - Should be backed up separately
  - Not needed in version control

---

## Miscellaneous Files

### Build Scripts
- **`build-for-hostinger.sh`** - Hostinger build script (459 bytes)
  - Deployment-specific script
  - Consider if this should be version controlled

### Server Scripts
- **`server/deploy-cors-fix.sh`** - CORS fix deployment script
  - Deployment utility
  - Consider if this should be version controlled

### Configuration Alternatives
- **`.htaccess.alternative`** - Alternative Apache config (2,607 bytes)
  - Backup configuration
  - May not be needed

### Excel Files
- **`Customer Screen Defect details-1.xlsx`** - Bug tracking spreadsheet (16,366 bytes)
  - Should be moved to issue tracker or project management tool
  - Not suitable for version control

### Unknown Files
- **`l.tom`** - Unknown file type
  - Purpose unclear
  - Should be investigated and removed if not needed

### Archive Files
- **`.zip`** - Zip archives (currently ignored)
- **`*.zip`** - All zip files
- **`*.tar.gz`** - Tar gzip archives
- **`*.rar`** - RAR archives

---

## Recommendations

### Immediate Actions
1. **Remove Excel file**: Move `Customer Screen Defect details-1.xlsx` to a proper issue tracker
2. **Investigate `l.tom`**: Determine purpose or delete
3. **Choose package manager**: Remove either `package-lock.json` or `bun.lockb`
4. **Review `.htaccess.alternative`**: Keep only if needed for reference

### Security Priorities
1. **Never commit**:
   - `.env` files (except `.env.example`)
   - `node_modules/`
   - Any files containing API keys, passwords, or tokens

### Documentation Strategy
2. **Consider unignoring important docs**:
   - `README.md` - Essential project documentation
   - Feature documentation that should be version controlled
   - Update `.gitignore` to exclude `*.md` but include specific docs

### Cleanup Commands
```bash
# Remove unwanted files (BE CAREFUL - review before running)
rm -f "Customer Screen Defect details-1.xlsx"
rm -f l.tom
rm -f .htaccess.alternative

# Choose your package manager and remove the other lock file
# If using npm:
rm -f bun.lockb

# If using bun:
rm -f package-lock.json

# Clean build artifacts
rm -rf dist/
rm -rf dist-ssr/
rm -rf gsap-public/

# Clean database exports (backup first!)
# rm -rf mongo_exports/
```

---

## Current .gitignore Status

The current `.gitignore` file is properly configured to exclude most unwanted files. However, consider:

1. **All `.md` files are ignored** - This may be too aggressive
2. **Build scripts** - Shell scripts may need to be version controlled
3. **Excel files** - Add `*.xlsx` and `*.xls` to gitignore

### Suggested .gitignore Updates
```gitignore
# Add these patterns:
*.xlsx
*.xls
*.zip
*.tar.gz
*.rar
mongo_exports/
l.tom

# Consider removing or modifying:
# *.md  # Too aggressive - prevents README from being tracked
```

---

## File Size Summary

### Large Unwanted Files/Directories
1. `node_modules/` - ~100MB+ (largest)
2. `dist/` - ~10-50MB (varies)
3. `mongo_exports/` - Size varies
4. `package-lock.json` - 307KB
5. `bun.lockb` - 197KB

### Total Recoverable Space
Removing unwanted files can free up significant disk space and reduce repository size.

---

**Last Updated**: 2025-12-05  
**Maintained By**: Development Team  
**Review Frequency**: Monthly or when adding new build tools/dependencies
