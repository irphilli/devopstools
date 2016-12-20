package com.technojeeves.zipgrep.processors;

import java.io.File;
import java.io.InputStream;
import java.io.PrintWriter;

import java.util.Scanner;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A class that processes text line-wise, looking
 * for pattern matches
 */

public class SimpleTextProcessor implements IProcessor {

    private final static String FOUND_FORMAT_STRING = "%s%s\tline %d\t%s%n";
    private PrintWriter writer;

    @Override
    public void processContent(InputStream in, File archiveFile, String pathPrefix, String nestedName,
                               Pattern pattern) {
        Scanner s = new Scanner(in);
        int lineNumber = 0;

        while (s.hasNextLine()) {
            String line = s.nextLine();

            ++lineNumber;

            Matcher m = pattern.matcher(line);

            if (m.matches()) {
                writer.printf(String.format(FOUND_FORMAT_STRING, pathPrefix, nestedName, lineNumber, line));
            }
        }
    }

    @Override
    public void setWriter(PrintWriter writer) {
        this.writer = writer;
    }
}


//~ Formatted by Jindent --- http://www.jindent.com
