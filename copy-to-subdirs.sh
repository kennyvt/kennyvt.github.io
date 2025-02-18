#!/bin/bash

# Check if correct arguments are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 source_file starting_directory"
    exit 1
fi

SOURCE_FILE="$1"
START_DIR="$2"

# Make sure source file exists
if [ ! -f "$SOURCE_FILE" ]; then
    echo "Error: Source file '$SOURCE_FILE' does not exist"
    exit 1
fi

# Make sure starting directory exists
if [ ! -d "$START_DIR" ]; then
    echo "Error: Starting directory '$START_DIR' does not exist"
    exit 1
fi

# Find all directories recursively and copy the file
find "$START_DIR" -type d -print | while read dir; do
    if [ "$dir" != "$START_DIR" ]; then  # Skip the starting directory itself
        echo "Copying '$SOURCE_FILE' to '$dir/'"
        cp "$SOURCE_FILE" "$dir/"
    fi
done

echo "Copy operation completed"
