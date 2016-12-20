package com.technojeeves.zipgrep.processors;

import java.io.File;
import java.io.InputStream;
import java.io.PrintWriter;

import java.util.regex.Pattern;

/**
 * This is the interface implemented by a class that searches inside an
 * archive entry. Different types of entry can require different kinds
 * of treatment
 */

public interface IProcessor {

    /**
     * The main processing method, during which patterns can be looked for
     * The InputStream must not be closed as it's the 'global' archive stream
     *
     *
     * @param in The InputStream of the zip archive
     * @param archiveFile The archive file itself
     * @param pathPrefix The prefix showing the nesting of archives for visualization purposes
     * @param nestedName The full path of the zip entry
     * @param pattern The search pattern
     */
    public void processContent(InputStream in, File archiveFile, String pathPrefix, String nestedName, Pattern pattern);

    /**
     * We need to be able to decide where output is going to be printed
     * @param writer The Writer to which to send output
     */
    public void setWriter(PrintWriter writer);
}


//~ Formatted by Jindent --- http://www.jindent.com
