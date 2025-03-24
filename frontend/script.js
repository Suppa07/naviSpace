const path = require('path');
const fs = require('fs');
/**
 * Recursively scans a folder and its subfolders for .js files and 
 * concatenates their content into a main file with the format:
 * <file_path>
 * <file_content>
 * 
 * @param {string} folderPath - Path to the folder containing .js files
 * @param {string} outputFilePath - Path where the main file will be created
 */
function concatenateJsFilesRecursively(folderPath, outputFilePath = 'main_output.txt') {
  try {
    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
      throw new Error(`The folder path "${folderPath}" does not exist.`);
    }

    // Create or clear the output file
    fs.writeFileSync(outputFilePath, '');
    
    // Track number of files processed
    let processedCount = 0;
    
    // Recursive function to process a directory and its subdirectories
    function processDirectory(dirPath) {
      // Read all items in the directory
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          // Skip node_modules and __tests__ directories
          if (item === 'node_modules' || item === '__tests__') {
            continue;
          }
          // If it's a directory, process it recursively
          processDirectory(itemPath);
        } else if (stats.isFile() && path.extname(item).toLowerCase() === '.js' || path.extname(item).toLowerCase() === '.jsx') {
          // If it's a .js file, read and append to output
          const content = fs.readFileSync(itemPath, 'utf8');
          
          // Append to the output file with the required format
          const formattedContent = `// File: ${itemPath} \n\n${content}\n\n\n`;
          fs.appendFileSync(outputFilePath, formattedContent);
          
          processedCount++;
        }
      }
    }
    
    // Start processing from the root folder
    processDirectory(folderPath);
    
    if (processedCount === 0) {
      console.log('No .js files found in the specified folder or its subfolders.');
      return;
    }
    
    console.log(`Successfully processed ${processedCount} JavaScript files recursively.`);
    console.log(`Output saved to "${outputFilePath}"`);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Example usage
// To use this function, call it with the folder path and optional output file path:
// concatenateJsFilesRecursively('/path/to/your/folder', 'output.txt');

// If you want to run this directly from command line:
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Please provide a folder path as an argument.');
    console.log('Usage: node script.js <folderPath> [outputFilePath]');
  } else {
    const folderPath = args[0];
    const outputPath = args[1] || 'main_output.txt';
    concatenateJsFilesRecursively(folderPath, outputPath);
  }
}

