import csv, getopt, collections, os, re, sys, glob, subprocess, logging, traceback
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
from Bio.Seq import Seq
import plotly.express as px
from scipy.stats import mannwhitneyu
from jinja2 import Template


logging.basicConfig(filename='/pubapps/mingyi.xie/clashhub/prod/app/Sbatch_documents/error.log', level=logging.DEBUG,
                    format='%(asctime)s:%(levelname)s:%(message)s')
class BedGraph():
    def making_simple_version(self, file, chromosome_name):
        with open(file, 'r+') as f1:
            for line1 in f1:
                line2 = line1.strip().split('\t')
                chromosome = line2[0]
                if chromosome_name == chromosome:
                    chr_start = int(line2[1])
                    chr_end = int(line2[2])
                    with open(f"{file.replace('.bedGraph', '')}_{chromosome}.bedGraph", 'a+') as f2:
                        if chr_end - chr_start == 1:
                            # f2.write(chromosome.replace('chrM', 'chrMT') + '\t' + str(chr_end) + '\t' + line2[3] + '\n')

                            f2.write(chromosome.replace('chrM', 'chrMtDNA') + '\t' + str(chr_end) + '\t' + line2[3] + '\n')
                        else:
                            for position in list(range(chr_start + 1, chr_end + 1)):
                                f2.write(chromosome + '\t' + str(position) + '\t' + line2[3] + '\n')

    def no_exist_conservation_socre_in_bedGraph(self, chr, position, f_transcript_conservation_score):  # I labeled '0' for individuals who do not have a conservation score in their genome.
        mux = pd.MultiIndex.from_arrays([[chr], [position]], names=[0, 1])
        df_if_conservation_score_not_exist = pd.DataFrame(0, index=mux, columns=[2])
        f_transcript_conservation_score = pd.concat(
            [f_transcript_conservation_score, df_if_conservation_score_not_exist])
        return f_transcript_conservation_score

class Database():
    def microRNA_database(self, input):  ## For analyzing the length of each miRNA\n",
        with open(input, 'r+') as f1:
            dict_miRNA, name1, seq1 = {}, '', ''
            for line1 in f1:
                if line1[0] == '>':
                    name1 = line1.strip()[1:]
                else:
                    seq1 = line1.strip()
                    if ('microRNA' in name1) and (seq1 != ''):
                        dict_miRNA[name1.split('_')[2]] = seq1
        return dict_miRNA

    def microRNA_sequence_to_name_database_1st_18nt(self,input):  ## dictionary miRNA seq to name, miRNA length at least 18nt
        with open(input, 'r+') as f1:
            dict_miRNA, name1, seq1 = {}, '', ''
            for line1 in f1:
                if line1[0] == '>':
                    name1 = line1.strip().split(' ')[0][1:]
                else:
                    seq1_short = line1.strip()[:18]
                    seq1_raw = line1.strip()
                    name1_seq1raw = f"{name1}&{seq1_raw}"
                    if (('miR-' in name1) or ('let-' in name1) or ('Spike' in name1)) and (seq1_short != ''):
                        dict_miRNA[seq1_short] = dict_miRNA.get(seq1_short, '')
                        dict_miRNA[seq1_short] = (dict_miRNA[seq1_short] + '_' + name1_seq1raw).lstrip('_')
        return dict_miRNA

    def making_unique_redundant_database_hg38(self, input):
        normal_chromosome_list = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16',
                                  '17', '18', '19', '20', '21', '22', 'X', 'Y', 'MT']
        unchr_name = {'RNA5-8SN4', 'KIR3DS1', 'KIR2DS1', 'FAM8A5P', 'RNU1-79P', 'KIR2DS5', 'LILRA3', 'HLA-DRB8',
                      'OR8U9', 'KIR2DS3', 'MAFIP', 'CCL3L1', 'TAS2R45', 'PRSS3P2', 'CACNA1C-IT2', 'KIR2DL2', 'KIR2DS2',
                      'HLA-DRB7', 'KIR2DL5A', 'KIR2DL5B', 'RNA5-8SN5', 'C4B_2', 'HLA-DRB3', 'OR8U8', 'GTF2H2C_2',
                      'HLA-DRB2', 'HLA-DRB4', 'OR9G9', 'PRAMEF22', 'GSTT1', 'RNU1-116P'}
        dict_set = set()
        dict_gene_type = set()
        f2 = open(input.replace('.txt', '_human_unique.fasta'), 'w+')
        f3 = open(input.replace('.txt', '_human_redundant.fasta'), 'w+')
        # integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{Gene_type}_mRNA'
        with open(input, 'r+') as f1:
            integrated_name, sequence = '', ''
            for line1 in f1:
                if ('>' in line1):
                    if ('miRNA' not in integrated_name) and (integrated_name != ''):
                        tmp_chr = integrated_name.split('_')[2].split('#')[1]
                        if tmp_chr in normal_chromosome_list:
                            if sequence not in dict_set:
                                f2.write(integrated_name + '\n')
                                f2.write(sequence + '\n')
                                dict_set.add(sequence)
                            elif sequence in dict_set:
                                f3.write(integrated_name + '\n')
                                f3.write(sequence + '\n')
                        elif tmp_chr not in normal_chromosome_list:
                            if sequence not in dict_set:
                                f2.write(integrated_name + '\n')
                                f2.write(sequence + '\n')
                                dict_set.add(sequence)
                            elif sequence in dict_set:
                                f3.write(integrated_name + '\n')
                                f3.write(sequence + '\n')
                    line2 = line1.replace('_', '&').strip().split('|')
                    sequence = ''
                    Gene_ID = line2[0][1:]
                    Transcript_ID = line2[1]
                    Gene_type = line2[2].replace('protein&coding', 'mRNA')
                    exons_left_list = line2[3]
                    exons_right_list = line2[4]
                    try:
                        CDS_left = min(int(x) for x in re.findall(r'\d+', line2[5]))
                        CDS_right = max(int(x) for x in re.findall(r'\d+', line2[6]))
                    except:
                        CDS_left, CDS_right = '0', '0'
                    strand = line2[7]
                    Chromosome = line2[8]
                    if len(line2) != 10:
                        Gene_name = 'NoName'
                    else:
                        Gene_name = line2[9]
                    dict_gene_type.add(Gene_type)
                    integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{Gene_type}_mRNA'
                else:
                    sequence += line1.strip()
            if 'miRNA' not in integrated_name:
                tmp_chr = integrated_name.split('_')[2].split('#')[1]
                if tmp_chr in normal_chromosome_list:
                    if sequence not in dict_set:
                        f2.write(integrated_name + '\n')
                        f2.write(sequence + '\n')
                        dict_set.add(sequence)
                    elif sequence in dict_set:
                        f3.write(integrated_name + '\n')
                        f3.write(sequence + '\n')
        f2.close()
        f3.close()
        print(dict_gene_type)

    def making_unique_redundant_database_mm39(self, input):
        normal_chromosome_list = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16',
                                  '17', '18', '19', 'X', 'Y', 'MT']
        dict_set = set()
        dict_gene_type = set()
        f2 = open(input.replace('.txt', '_mm39_unique.fasta'), 'w+')
        f3 = open(input.replace('.txt', '_mm39_redundant.fasta'), 'w+')
        # integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{Gene_type}_mRNA'
        with open(input, 'r+') as f1:
            integrated_name, sequence = '', ''
            for line1 in f1:
                if ('>' in line1):
                    if ('miRNA' not in integrated_name) and (integrated_name != ''):
                        tmp_chr = integrated_name.split('_')[2].split('#')[1]
                        if tmp_chr in normal_chromosome_list:  # The newly generated mouse transcript database will not support genes that are not located on non-normal chromosomes.
                            if sequence not in dict_set:
                                f2.write(integrated_name + '\n')
                                f2.write(sequence + '\n')
                                dict_set.add(sequence)
                            elif sequence in dict_set:
                                f3.write(integrated_name + '\n')
                                f3.write(sequence + '\n')
                    line2 = line1.replace('_', '&').strip().split('|')
                    sequence = ''
                    Gene_ID = line2[0][1:]
                    Transcript_ID = line2[1]
                    Gene_type = line2[2].replace('protein&coding', 'mRNA')
                    exons_left_list = line2[3]
                    exons_right_list = line2[4]
                    try:
                        CDS_left = min(int(x) for x in re.findall(r'\d+', line2[5]))
                        CDS_right = max(int(x) for x in re.findall(r'\d+', line2[6]))
                    except:
                        CDS_left, CDS_right = '0', '0'
                    strand = line2[7]
                    Chromosome = line2[8]
                    if len(line2) != 10:
                        Gene_name = 'NoName'
                    else:
                        Gene_name = line2[9]
                    dict_gene_type.add(Gene_type)
                    integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{Gene_type}_mRNA'
                else:
                    sequence += line1.strip()
            if 'miRNA' not in integrated_name:
                tmp_chr = integrated_name.split('_')[2].split('#')[1]
                if tmp_chr in normal_chromosome_list:
                    if sequence not in dict_set:
                        f2.write(integrated_name + '\n')
                        f2.write(sequence + '\n')
                        dict_set.add(sequence)
                    elif sequence in dict_set:
                        f3.write(integrated_name + '\n')
                        f3.write(sequence + '\n')
        f2.close()
        f3.close()
        print(dict_gene_type)

    def making_unique_redundant_database_WBcel235(self, input):
        normal_chromosome_list = ['I', 'II', 'III', 'IV', 'V', 'X', 'MtDNA']
        dict_set = set()
        dict_gene_type = set()
        f2 = open(input.replace('.txt', '_WBcel235_unique.fasta'), 'w+')
        f3 = open(input.replace('.txt', '_WBcel235_redundant.fasta'), 'w+')
        # integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{Gene_type}_mRNA'
        with open(input, 'r+') as f1:
            integrated_name, sequence = '', ''
            for line1 in f1:
                if ('>' in line1):
                    if ('miRNA' not in integrated_name) and (integrated_name != ''):
                        tmp_chr = integrated_name.split('_')[2].split('#')[1]
                        if tmp_chr in normal_chromosome_list:  # The newly generated worm transcript database will not support genes that are not located on non-normal chromosomes.
                            if sequence not in dict_set:
                                f2.write(integrated_name + '\n')
                                f2.write(sequence + '\n')
                                dict_set.add(sequence)
                            elif sequence in dict_set:
                                f3.write(integrated_name + '\n')
                                f3.write(sequence + '\n')
                    line2 = line1.replace('_', '&').strip().split('|')
                    sequence = ''
                    Gene_ID = line2[0][1:]
                    Transcript_ID = line2[1]
                    Gene_type = line2[2].replace('protein&coding', 'mRNA')
                    exons_left_list = line2[3]
                    exons_right_list = line2[4]
                    try:
                        CDS_left = min(int(x) for x in re.findall(r'\d+', line2[5]))
                        CDS_right = max(int(x) for x in re.findall(r'\d+', line2[6]))
                    except:
                        CDS_left, CDS_right = '0', '0'
                    strand = line2[7]
                    Chromosome = line2[8]
                    if len(line2) != 10:
                        Gene_name = 'NoName'
                    else:
                        Gene_name = line2[9]
                    dict_gene_type.add(Gene_type)
                    integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{Gene_type}_mRNA'
                else:
                    sequence += line1.strip()
            if 'miRNA' not in integrated_name:
                tmp_chr = integrated_name.split('_')[2].split('#')[1]
                if tmp_chr in normal_chromosome_list:
                    if sequence not in dict_set:
                        f2.write(integrated_name + '\n')
                        f2.write(sequence + '\n')
                        dict_set.add(sequence)
                    elif sequence in dict_set:
                        f3.write(integrated_name + '\n')
                        f3.write(sequence + '\n')
        f2.close()
        f3.close()
        print(dict_gene_type)

    def making_transcript_sequence_genomeposition_conservation_database(self, genome_file, transcript_file, chr_name):
        dict_genome = self.loading_genome_database_as_dict(genome_file)
        dict_transcript = self.loading_transcript_databse(transcript_file)
        # f_bedGraph = pd.read_table(f'phyloP100way.bedGrph_chr{chr_name}.bedGraph', index_col=[0, 1], header=None)#human
        # f_bedGraph = pd.read_table(f'mm39.phyloP35way_chr{chr_name}.bedGraph', index_col=[0, 1], header=None)#mouse
        f_bedGraph = pd.read_table(f'ce11.phyloP135way_chr{chr_name}.bedGraph', index_col=[0, 1], header=None)# Worm

        output_file = f"{transcript_file.replace('.fasta', '_')}{chr_name}_conservation_score.txt"
        if os.path.exists(output_file):
            os.remove(output_file)

        f2 = open(output_file, 'a+')
        num1 = 0
        for transcript_name, sequence in dict_transcript.items():
            num1 += 1
            print(num1)
            if transcript_name.count('#') == 7:
                #target_chromosome = transcript_name.split('_')[2].split('#')[1].replace('MT', 'M')#human/mouse
                target_chromosome = transcript_name.split('_')[2].split('#')[1] # Worm
                target_exons_genome_start_sites = sorted(
                    int(x) for x in transcript_name.split('_')[2].split('#')[2].split(';'))
                target_exons_genome_end_sites = sorted(
                    int(x) for x in transcript_name.split('_')[2].split('#')[3].split(';'))
                target_all_sites = zip(target_exons_genome_start_sites,
                                       target_exons_genome_end_sites)  ## the number show the left and right location of each exon in the genome, 1st, this function is iterator
            else:
                target_chromosome = 'not exist'  ## i didn't label miRNA position in the genome
            target_position_in_genome = []
            target_sequence_in_genome = ''

            if target_chromosome == chr_name:
                for exon_sites in target_all_sites:
                    target_position_in_genome += list(range(exon_sites[0], exon_sites[
                        1] + 1))  ## target whole sequence location or position or site in the genome
                    target_sequence_in_genome += dict_genome[target_chromosome][exon_sites[0] - 1:exon_sites[
                        1]]  ## this sequence could same or reverse complementary of transcript (in the negative strand)
                target_position_in_genome_str = ','.join(
                    str(x) for x in target_position_in_genome)  ## switch target site from number to string in list
                transcripts_site_in_genome = list(map(lambda x: ('chr' + target_chromosome, int(x)),
                                                      target_position_in_genome))  ## e.g. ('2L', 42), in case some position not exist in the bedGraph
                f_transcript_conservation_score = pd.DataFrame()
                for chromosome_site in transcripts_site_in_genome:  ## chromosome site: e.g. ('2L', 42)
                    try:  # if conservation score exist in bedGraph
                        f_transcript_conservation_score = pd.concat(
                            [f_transcript_conservation_score, f_bedGraph.loc[[chromosome_site]]])
                    except:  # if conservation score not exist in bedGraph
                        f_transcript_conservation_score = BedGraph().no_exist_conservation_socre_in_bedGraph(
                            target_chromosome, chromosome_site[1], f_transcript_conservation_score)
                each_transcript_conservation_score = ','.join([str(x) for x in f_transcript_conservation_score[2]])
                f2.write('>' + transcript_name + '\n')  ## write transcript name
                f2.write(target_sequence_in_genome + '\n')
                f2.write(target_position_in_genome_str + '\n')  ## write transcript position from genome
                f2.write(each_transcript_conservation_score + '\n')
        f2.close()

    def loading_genome_database_as_dict(self, file):
        dict_genome = {}
        with open(file, 'r+') as f1:
            chromosome, sequence = '', ''
            for line1 in f1:
                if '>' == line1[0]:
                    if chromosome != '':
                        dict_genome[chromosome] = sequence
                    # chromosome = line1.split(' ')[0].strip('>').replace('MT', 'M') # Human/Mouse
                    chromosome = line1.split(' ')[0].strip('>') # Worm
                    sequence = ''
                else:
                    sequence += line1.strip()
            dict_genome[chromosome] = sequence
        return dict_genome

    def transcript_sequence_genomeposition_conservation_database(self, file):
        dict_CS = {}  ## the database including name, sequence, position and conservation score, the sequence from genome, could be reverse complementary from transcript
        with open(file, 'r+') as f1:
            for line1 in f1:
                if line1[0] == '>':
                    name1 = line1.strip()[1:]
                else:
                    dict_CS[name1] = dict_CS.get(name1, [])
                    dict_CS[name1].append(line1.strip())
        return dict_CS

    def loading_transcript_databse(self, file):
        dict_transcipts = {}  ## the databse including transcript, sequence
        with open(file, 'r+') as f1:
            for line1 in f1:
                if line1[0] == '>':
                    name1 = line1.strip()[1:]
                else:
                    dict_transcipts[name1] = (line1.strip())
        return dict_transcipts

    def sequence_name_database(self, file):  ## sequence as  key, name as item
        dict_seq_name = {}
        with open(file, 'r+') as f1:
            for line1 in f1:
                if line1[0] == '>':
                    name1 = line1.strip()[1:]
                else:
                    sequence = line1.strip()
                    dict_seq_name[sequence] = dict_seq_name.get(sequence, [])
                    dict_seq_name[sequence].append(name1)
        return dict_seq_name

    def unique_redundant_geneID_dict(self, unique_database, redundant_database):
        unique_redundant_name_dict1 = {}
        unique_transcripts = self.sequence_name_database(unique_database)
        redundant_transcripts = self.sequence_name_database(redundant_database)
        for seq, redundant_name_list in redundant_transcripts.items():
            unique_geneID = unique_transcripts[seq][0].split('_')[0]  # remove gene name, only keep gene_ID
            for redundant_name in redundant_name_list:
                redundant_geneID = redundant_name.split('_')[0]
                redundant_transcriptID = redundant_name.split('_')[1]
                redundant_strand = redundant_name.split('_')[2].split('#')[4]
                redundant_exon_min = min(int(x) for x in redundant_name.split('_')[2].split('#')[2].split(';'))
                redundant_exon_max = max(int(x) for x in redundant_name.split('_')[2].split('#')[3].split(';'))
                redundant_CDS_min = min(int(x) for x in redundant_name.split('_')[2].split('#')[5].split(';'))
                redundant_CDS_max = min(int(x) for x in redundant_name.split('_')[2].split('#')[6].split(';'))
                redundant_exon_range_str = f"{redundant_exon_min}-{redundant_exon_max}"
                redundant_CDS_range_str = f"{redundant_CDS_min}-{redundant_CDS_max}"
                if redundant_geneID != unique_geneID:
                    unique_redundant_name_dict1[unique_geneID] = unique_redundant_name_dict1.get(unique_geneID, {})
                    unique_redundant_name_dict1[unique_geneID][redundant_transcriptID] = unique_redundant_name_dict1[
                        unique_geneID].get(redundant_transcriptID, {'strand': '', 'exon_range': '', 'CDS_range': ''})
                    unique_redundant_name_dict1[unique_geneID][redundant_transcriptID]['strand'] = redundant_strand
                    unique_redundant_name_dict1[unique_geneID][redundant_transcriptID][
                        'exon_range'] = redundant_exon_range_str
                    unique_redundant_name_dict1[unique_geneID][redundant_transcriptID][
                        'CDS_range'] = redundant_CDS_range_str
        return unique_redundant_name_dict1

class Viennad_to_table():
    def __init__(self, transcript_ConservationScore_database=None, transcript_only_database=None):
        if transcript_ConservationScore_database is not None:
            self.dict_CS = Database().transcript_sequence_genomeposition_conservation_database(
                file=transcript_ConservationScore_database)
        if transcript_only_database is not None:
            self.dict_transcript = Database().loading_transcript_databse(file=transcript_only_database)

    def input_viennad(self, file):
        try:
            viennad_file = file + '.viennad'
            print(viennad_file)
            with open(viennad_file, 'r+') as f1:
                list_hyb = [] #将viennad文件每6行组合成一个list，代表每个hybrids所有信息，包括miRNA-target 信息，序列，basettern
                dict_hyb = {}
                no_exist_transcript_in_dict_cs = set()
                for line1 in f1:
                    line2 = line1.strip().split('_')
                    if len(line2) == 15:  # 对于hyb software，我用使用type=mim pref=mim，在viennad文件中，all microRNA on the left of hybrid
                        if (list_hyb != []) and (len(list_hyb[4].split('\t')) == 2) and ('microRNA' in list_hyb[0]) and (
                                'mRNA' in list_hyb[0]): # 在加载新的list_hyb之前，对前一个list_hyb进行分析，包括提取hybrid表达量，miRNA-target名字，基因组位置，RNA类型等信息
                            hyb_each_num = int(list_hyb[0].split('_')[1]) # 这个hybrids对应的的reads数目
                            miRNA_name = list_hyb[0].split('_')[4] #miRNA name
                            miRNA_seq = list_hyb[2].split('\t')[0].strip('-')  ##### miRNA sequence
                            miRNA_length = len(miRNA_seq) #计算miRNA长度
                            miRNA_pattern = list_hyb[4][:miRNA_length]  ##### 提取miRNA pattern
                            miRNA_pattern_short = miRNA_pattern.strip('.')  ## 仅仅提取miRNA配对的pattern，为什么做这个？用于计算左右两个有多少个碱基不能配对，然后后面计算target配对序列后，可以准备提取target与miRNA配对和不配对的序列 remove '.' in the  outside of '('
                            miRNA_pattern_short_pattern = ''.join('\\' + x for x in miRNA_pattern_short)
                            miRNA_unpaired_5prime_length = re.search(miRNA_pattern_short_pattern, miRNA_pattern).span()[0] #计算miRNA 序列5’端有几个碱基没有与target配对
                            miRNA_unpaired_3prime_length = miRNA_length - re.search(miRNA_pattern_short_pattern, miRNA_pattern).span()[1] #计算miRNA 序列3’端有几个碱基没有与target配对
                            gene_id = list_hyb[0].split('_')[9] # 基因ID，如ENSG
                            transcript_id = list_hyb[0].split('_')[10] # 基因转录本，如ENST
                            target_name = list_hyb[0].split('_')[11] # target name信息包括基因名字，genome信息，strand +or -， RNA类型, 如 MAP7D3#X#136246065;136220765;136244632;136224827;136219627;136225909;136222393;136246243;136230839;136241160;136251289;136240382;136236244;136231544;136230385;136227284;136228623#136246148;136220963;136244795;136224880;136219671;136226013;136222486;136246341;136230966;136241277;136251382;136240486;136236339;136232097;136230593;136227431;136228758#-1#136219627#136251358#mRNA
                            target_pattern_element_only = list_hyb[4].split('\t')[0][miRNA_length:].strip('.')  ##### target pattern，仅仅包括target 配对序列的pattern，不包括不和miRNA配对的pattern
                            target_pattern_element_only_format = ''.join('\\' + x for x in target_pattern_element_only)
                            target_seq_in_Viennad = list_hyb[3].split('\t')[0].strip('-')  ## 在viennad中， target所有序列，包括配对的序列以及以外更长的序列
                            target_pattern_in_Viennad = list_hyb[4].split('\t')[0][miRNA_length:] # Viennad中target的base pattern，包括配对的basepattern和以外的“.”
                            transcript_name = '_'.join([gene_id, transcript_id, target_name, 'mRNA'])#全面的转录本名字，包括基因ID，转录本ID，target名字和RNA类型？？ 这个transcript name 名字和 所使用的数据库名字 完全一样
                            target_seq_completed = '-' * 20 + self.dict_transcript[transcript_name] + '-' * 20  ## 直接对转录本的每个序列前后加上 20个“-”，以防某些转录本太短，当展示target序列的时候，就可以用“-”代替
                            target_seq_in_Viennad_start = (re.search(target_seq_in_Viennad, target_seq_completed).start()) # 找到viennad中target序列在基因组的位置，包括pairing的序列 和 pairing两边一些在viennad中存在的一些更长的pairing两边的序列
                            target_seq_in_Viennad_end = (re.search(target_seq_in_Viennad, target_seq_completed).end())
                            target_seq_in_Viennad_extend20nt = target_seq_completed[target_seq_in_Viennad_start - 20: target_seq_in_Viennad_end + 20] # 通过viennad文件中 target序列，然后提取转录本数据中更全的碱基序列，左右各延长20bp， 为什么干这个？因为有些viennad的target序列太短，为了使与miRNA配对的target 序列都存在，所以只能提取转录组中原始的target序列，在补齐 存在的短的target序列
                            target_pattern_in_Viennad_extended = '.' * 20 + target_pattern_in_Viennad + '.' * 20 # 在viennad文件的target pattern 两边又各加了20个 “.”
                            target_pattern_element_only_span = (re.search(target_pattern_element_only_format, target_pattern_in_Viennad_extended)).span() # 定位仅仅pairing的target序列 在 比Viennad原序列左右各延伸20bp碱基的target序列的准确 位置
                            target_start_num = target_pattern_element_only_span[0] - miRNA_unpaired_3prime_length # 定位target 与miRNA相关的碱基 （包括pairing的和 可能不paring的） 在 比Viennad原序列左右各延伸20bp碱基的target序列的准确 位置
                            target_end_num = target_pattern_element_only_span[1] + miRNA_unpaired_5prime_length
                            target_seq_element = target_seq_in_Viennad_extend20nt[target_start_num:target_end_num]  #### 提取target序列，包含pairing的和不pairing的
                            target_pattern_element = target_pattern_in_Viennad_extended[target_start_num:target_end_num] #### 提取target的basepattern，包含pairing的和不pairing的
                            strand = list_hyb[0].split('_')[11].split('#')[4] # 转录本 strand， + or -
                            energy = list_hyb[4].split('\t')[1][1:-1] #提取dG自由能

                            hyb_name = '_'.join(
                                [miRNA_name, miRNA_seq, miRNA_pattern, gene_id, transcript_id, target_name,
                                 target_seq_element, target_pattern_element, energy])
                            dict_hyb[hyb_name] = dict_hyb.get(hyb_name,
                                                              {'abundance': 0, 'conservation_score': set(),
                                                               'genome_position': set()})
                            if strand == '-1':
                                target_seq_in_Viennad = str(Seq(target_seq_in_Viennad).reverse_complement())
                                target_pattern_in_Viennad = target_pattern_in_Viennad[::-1]  ## for identify the paired nucleotides position in the genome
                            if transcript_name in self.dict_CS:
                                # print(line1.strip(),'aaa1')
                                # print(transcript_name,self.dict_CS[transcript_name][0],target_seq_in_Viennad,'aaa2')
                                target_position_in_genome_span = re.search(target_seq_in_Viennad,
                                                                           self.dict_CS[transcript_name][0]).span()
                                target_element_position = self.dict_CS[transcript_name][1].split(',')[
                                                          target_position_in_genome_span[0]:target_position_in_genome_span[1]]

                                target_element_conservation_score = [float(x) for x in
                                                                     self.dict_CS[transcript_name][2].split(',')[
                                                                     target_position_in_genome_span[0]:
                                                                     target_position_in_genome_span[1]]]
                                target_element_data = {'pattern': list(target_pattern_in_Viennad),
                                                       'genome_seq': list(target_seq_in_Viennad),
                                                       'position': target_element_position,
                                                       'CS': target_element_conservation_score}
                                target_element_dataframe = pd.DataFrame(data=target_element_data)
                                target_element_dataframe = target_element_dataframe[
                                    target_element_dataframe['pattern'] == ')']  ## remove unpaired position
                                target_element_only_conservation_score = {np.around(target_element_dataframe['CS'].mean(), decimals=2)}  ## conservation score without unpaired position
                                dict_hyb[hyb_name]['conservation_score'].update(target_element_only_conservation_score)
                                dict_hyb[hyb_name]['genome_position'].update(set(target_element_dataframe['position'])) # 计算target element 保守序性的时候，仅仅考虑配对的碱基，这里的postion也仅仅是配对的碱基
                            if (transcript_name not in self.dict_CS) and (
                                    transcript_name not in no_exist_transcript_in_dict_cs):
                                no_exist_transcript_in_dict_cs.add(transcript_name)
                                print(f"{transcript_name} is not in dict_CS")  ## no conservation socre out
                            dict_hyb[hyb_name]['abundance'] += hyb_each_num
                        list_hyb = []
                    list_hyb.append(line1.strip())
            f2 = open(viennad_file.replace('viennad', 'txt'), 'w+')
            f2.write(
                f'miRNA_name\tmiRNA_sequence\tmiRNA_pattern\tGene_ID\ttranscript_ID\tGene_information\telement_sequence\telement_pattern\tdG\tabundance\tgenome_position\tConservation_score\n')
            for name in dict_hyb:
                if dict_hyb[name][
                    'conservation_score'] == set():  # 保守性数据不存在，主要是18S，28S rRNA
                    f2.write('\t'.join(name.split('_')) + '\t' + str(dict_hyb[name]['abundance']) + '\n')
                elif dict_hyb[name]['conservation_score'] != set():
                    genome_position_str = str(sorted([int(x) for x in dict_hyb[name]['genome_position']]))
                    if len(dict_hyb[name]['conservation_score']) == 1: # 只有一个保守分数
                        f2.write('\t'.join(name.split('_')) + '\t' + str(
                            dict_hyb[name]['abundance']) + '\t' + genome_position_str + '\t' + str(
                            max(dict_hyb[name]['conservation_score'])) + '\n')
                    else:  # 尤其在果蝇基因组，there are multiple conservation scores, 0.1% type of  hybs have multiple CS, because their repetitive sequence in the genome. Ming and Nick suggest me to keep all those, but delete conservation score. Lable as multiple repetitive element.
                        f2.write(
                            '\t'.join(name.split('_')) + '\t' + str(dict_hyb[name]['abundance']) + '\t' + 'multiple_elements' + '\t' + str(max(dict_hyb[name]['conservation_score'])) + '\n')  # there are multiple element site in one transcript, i will put the largest conservation score, but i don't show the position
            f2.close()
            print("Step I done.\n")
        except Exception as e:
            traceback.print_exc()

    def basepattern_convert(self, index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern, element_pattern_symmetry_reverse): # convert basepattern from branket "(" or ")" to "|"
        if miRNA_pattern[index_nt_length] == element_pattern_symmetry_reverse[index_nt_length]:
            if (miRNA_pattern[index_nt_length] == " ") and  (element_pattern_symmetry_reverse[index_nt_length] == " "):
                pass
            elif (miRNA_pattern[index_nt_length] == "|") and  (element_pattern_symmetry_reverse[index_nt_length] == "|"):
                # UG pairing
                if (target_seq_reverse[index_nt_length] == "G" and miRNA_seq[index_nt_length] == "T") or (target_seq_reverse[index_nt_length] == "T" and miRNA_seq[index_nt_length] == "G"):
                    miRNA_pattern = miRNA_pattern[:index_nt_length] + "." + miRNA_pattern[index_nt_length + 1:]
                    element_pattern_symmetry_reverse = element_pattern_symmetry_reverse[:index_nt_length] + "." + element_pattern_symmetry_reverse[index_nt_length + 1:]
                else: # Not UG pairing
                    pass
        elif miRNA_pattern[index_nt_length] != element_pattern_symmetry_reverse[index_nt_length]: # exist bulge
            if (miRNA_pattern[index_nt_length] == " ") and (element_pattern_symmetry_reverse[index_nt_length] == "|"):
                element_pattern_symmetry_reverse = element_pattern_symmetry_reverse[:index_nt_length] + " " + element_pattern_symmetry_reverse[index_nt_length:]
                target_seq_reverse = target_seq_reverse[:index_nt_length] + "-" + target_seq_reverse[index_nt_length:]
            elif (element_pattern_symmetry_reverse[index_nt_length] == " ") and (miRNA_pattern[index_nt_length] == "|"):
                miRNA_pattern = miRNA_pattern[:index_nt_length] + " " + miRNA_pattern[index_nt_length:]
                miRNA_seq = miRNA_seq[:index_nt_length] + "-" + miRNA_seq[index_nt_length:]
        index_nt_length += 1
        return (index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern, element_pattern_symmetry_reverse)

    def file_Basepattern_FinalResult(self, inputFile):
        basepattern_df = pd.read_table(inputFile, header=[0])
        new_df = pd.DataFrame(
            columns=["miRNA_name", "miRNA (5'-3')", "Pairing_pattern", "target (3'-5')", "Conservation_score", "Gene_name",
                     "Free_Energy", "Gene_type","Gene_ID","Strand", "abundance", "element_region", "chr_genome_position", "site_type"])

        for index_clashTable, row in basepattern_df.iterrows():
            dG = row["dG"]
            genome_position = row["genome_position"]
            Gene_type = row["Gene_type"]
            Chromosome = row["Chromosome"]
            abundance = row["abundance"]
            element_region = row["element_region"]
            Strand = row["Strand"]
            Gene_ID = row["Gene_ID"]

            miRNA_pattern = row["miRNA_pattern"].replace("(", "|").replace(".", " ")
            miRNA_name = row["miRNA_name"]
            miRNA_seq = row["miRNA_sequence"]
            Conservation_score = row["Conservation_score"]
            Gene_name = row["Gene_name"]

            element_pattern_symmetry_reverse = row["element_pattern"][::-1].replace(")", "|").replace(".", " ")
            target_seq = row["element_sequence"]
            target_seq_reverse = target_seq[::-1]

            ####### 以下这部分是转换miRNA-target base pattern，让他们之间能够完全匹配，包括加 “-” 或者 ‘.’ 转换
            index_nt_length = 0
            if len(miRNA_seq) < len(target_seq_reverse):
                while index_nt_length <= len(target_seq_reverse) - 1:
                    index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern, element_pattern_symmetry_reverse = self.basepattern_convert(
                        index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern,
                        element_pattern_symmetry_reverse)  # convert each base pattern
            elif len(miRNA_seq) >= len(target_seq_reverse):
                while index_nt_length <= len(miRNA_seq) - 1:
                    index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern, element_pattern_symmetry_reverse = self.basepattern_convert(
                        index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern,
                        element_pattern_symmetry_reverse)  # convert each base pattern
            ########

            if (" " not in miRNA_pattern[0:8]) and (target_seq_reverse[0] == "A"):
                site_type = "8mer"
            elif (" " not in miRNA_pattern[1:8]):
                site_type = "7mer-m8"
            elif (" " not in miRNA_pattern[0:7]) and (target_seq_reverse[0] == "A"):
                site_type = "7mer-A1"
            elif (" " not in miRNA_pattern[1:7]):
                site_type = "6mer"
            elif (" " not in miRNA_pattern[2:8]):
                site_type = "Offset_6mer"
            else:
                site_type = "non-seed match"

            if pd.isna(genome_position): # 检查 genome_position 是否为 NaN 或 float，如果是，则转换为字符串类型, 我在果蝇S2细胞的hyb文件发现很多的nan
                genome_position = ""

            genome_position = genome_position.strip("[]").split(", ")  # 将target element 位置变成 min-max，简单化
            # 对每个元素进行判断，如果是数字则转为int，否则保留原字符串
            genome_position = [int(num) if num.isdigit() else num for num in genome_position]
            try:
                element_region = element_region.replace(";", "_")  # 如果是mRNA，那么将CDS;UTR中间的;改为_，不然HTML无法识别sql脚本
            except:
                pass

            # 我需要知道base pattern 左右分别有多少空格
            left_spaces = len(miRNA_pattern) - len(miRNA_pattern.lstrip())
            right_spaces = len(miRNA_pattern) - len(miRNA_pattern.rstrip())

            # 对于绝大多数target，精确计算element在基因组未出
            if (genome_position != []) and ("multiple_elements" not in genome_position) and (genome_position != ['']):
                # 如果列表不为空且每个元素都是数字字符串
                # 将字符串数字转换为整数列表
                numeric_positions = [int(num) for num in genome_position]
                # 根据正反链来调整位置
                if str(Strand) == "1":  # 如果链为正向
                    # 计算并设置位置，考虑右边空格数和左边空格数的偏移
                    chr_genome_position1 = f"chr{Chromosome}:{min(numeric_positions) - right_spaces}-{max(numeric_positions) + left_spaces}"
                elif str(Strand) == "-1":  # 如果链为反向
                    # 计算并设置位置，考虑左边空格数和右边空格数的偏移
                    chr_genome_position1 = f"chr{Chromosome}:{min(numeric_positions) - left_spaces}-{max(numeric_positions) + right_spaces}"
            else:# 如果target出现潜在的多个elements，那么目前不给位置
                # 如果列表为空或包含非数字字符串
                if genome_position:  # 列表不为空但包含非数字
                    # 将列表转换为逗号分隔的字符串，保留所有非数字和数字字符
                    chr_genome_position1 = f"chr{Chromosome}:{','.join(genome_position)}"
                else:  # 列表为空
                    # 使用默认值表示未知位置
                    chr_genome_position1 = f"chr{Chromosome}:multiple element"

            new_row = {
            "miRNA_name": miRNA_name,
            "miRNA (5'-3')": miRNA_seq,
            "Pairing_pattern": miRNA_pattern,  # 理论上miRNA pattern 和 target_reverse pattern 在校准后应该一样
            "target (3'-5')": target_seq_reverse,
            "Conservation_score": Conservation_score,
            "Gene_name": Gene_name,
            "Gene_ID": Gene_ID,
            "Free_Energy": dG,
            "Gene_type": Gene_type,
            "Strand" : Strand,
            "abundance": abundance,
            "element_region": element_region,
            "chr_genome_position": chr_genome_position1,
            "site_type": site_type}

            # 将新行添加到新的DataFrame中
            new_df = pd.concat([new_df, pd.DataFrame([new_row])], ignore_index=True)
        outputFile = inputFile.replace("_region.txt","_FinalResult.csv")
        new_df.to_csv(f'{outputFile}', index=False)
        print("Step V done.\n")

class Combined_table():
    def __init__(self, replicates=2, outfile='out.csv'):
        self.replicates = replicates
        self.outfile = outfile

    def Concat_mirnaCount(self, JobIDinput):
        try:
            # Change to the appropriate directory
            os.chdir(f"/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/{JobIDinput}")
            print(f"miRNA count Concat in python3: {JobIDinput}")

            # Process total count files
            list_total = sorted(glob.glob("*totalCount.csv"))
            if list_total:
                f_total_all = pd.DataFrame()
                for each_file in list_total:
                    # Read CSV with 'miRNA_name' as index
                    f1 = pd.read_csv(each_file, index_col=[0])
                    f_total_all = pd.concat([f_total_all, f1], axis=1)
                f_total_all.to_csv('AllSample_RawCount.csv', index=True)
                print("Total count files concatenated into AllSample_RawCount.csv")
            else:
                print("No total count files found.")

            # Process isoform count files
            list_isoform = sorted(glob.glob("*Isoform_mirnaCount.csv"))
            if list_isoform:
                f_isoform_all = pd.DataFrame()
                for each_file in list_isoform:
                    # Read CSV with 'miRNA_name' and 'Sequence' as composite index
                    f1 = pd.read_csv(each_file, index_col=[0, 1])
                    f_isoform_all = pd.concat([f_isoform_all, f1], axis=1)
                f_isoform_all.to_csv('AllSample_Isoform_RawCount.csv', index=True)
                print("Isoform count files concatenated into AllSample_Isoform_RawCount.csv")
            else:
                print("No isoform count files found.")
        except Exception as e:
            print(f"An error occurred in miRNA count Concat step: {e}")

    def rnaseqTPM_merge(self, JobID1, species1):
        try:
            os.chdir(f"/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/{JobID1}")
            print(f"rnaseqTPM_merge: {JobID1}")
            all_tpm_tables = glob.glob("*.sortBypos.table")

            f_all = pd.DataFrame()
            for each_file in sorted(all_tpm_tables):
                f1 = pd.read_table(each_file)
                f1 = f1.sort_values(by='TPM', ascending=False).drop_duplicates(subset=['Gene ID'], keep='first')
                f1 = f1.set_index('Gene ID')
                tpm_values = f1['TPM']
                new_column_name = each_file.replace(".sortBypos.table", "")
                tpm_values.rename(new_column_name, inplace=True)
                f_all = pd.concat([f_all, tpm_values], axis=1)

            f_all.index.set_names(['GeneID'], inplace=True)

            if species1 == "Human":
                f2 = pd.read_csv(f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Hg38/human_geneIDNameType.csv",index_col=[0])  # human geneID name
            elif species1 == "Mouse":
                f2 = pd.read_csv(
                    f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Mouse/20240719Mouse_geneIDNameType.csv",
                    index_col=[0])  # mouse geneID name

            elif species1 == "D.melanogaster":
                f2 = pd.read_csv(
                    f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Drosophila2/20240719Drosophila_geneIDNameType.csv",
                    index_col=[0])  # fly geneID name
            elif species1 == "C.elegans":
                f2 = pd.read_csv(f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Celegans/20240719Celegans_geneIDNameType.csv",index_col=[0])  # Celegans geneID name

            f_all =pd.concat([f_all, f2], axis=1).reindex(f_all.index)

            f_all.to_csv("geneTPM.csv", index=True)  # 保存索引到文件中
            print("rnaseq merge done!")
        except Exception as e:
            print(f"An error occurred: {e}")

    def rnaseqDEseqtable_merge(self, JobID1, species1):
        try:
            os.chdir(f"/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/{JobID1}")
            print(f"rnaseqDEseqtable_merge: {JobID1}")
            f1 = pd.read_csv("differential_expression_results.csv", index_col=0, quotechar='"')

            if species1 == "Human":
                f2 = pd.read_csv(f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Hg38/human_geneIDNameType.csv",index_col=[0])  # human geneID name
            elif species1 == "Mouse":
                f2 = pd.read_csv(
                    f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Mouse/20240719Mouse_geneIDNameType.csv",index_col=[0])  # mouse geneID name
            elif species1 == "D.melanogaster":
                f2 = pd.read_csv(
                    f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Drosophila2/20240719Drosophila_geneIDNameType.csv",index_col=[0])  # fly geneID name
            elif species1 == "C.elegans":
                f2 = pd.read_csv(f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Celegans/20240719Celegans_geneIDNameType.csv",index_col=[0])  # Celegans geneID name

            f_all = f1.merge(f2, how="left", left_index=True, right_index=True)

            f_all.to_csv("DE_results.annotated.csv", index=True)  # 保存索引到文件中
            print("rnaseqDEseqtable merge done!")
        except Exception as e:
            print(f"An error occurred: {e}")

    def TDMD_candidate(self, input_file):
        output1 = input_file.replace('.txt', '_TDMD.txt')
        if os.path.exists(output1):
            os.remove(output1)

        f1 = pd.read_table(input_file, header=[0])
        f1 = f1.query('dG<-16')  ## TDMD base pattern, dG <= -16
        first_line1 = '\t'.join(list(f1.columns))

        f2 = open(output1, 'a+')
        f2.write(first_line1 + '\n')
        print(
            'TDMD analysis criteria\n1. miRNA seed region 2-8 pair with target\n2. abs|bulge| <= 6nt\n3. P2: 7 continuous pairing in last 8nt or 9 continuous pairing in any position.\n4. dG <= 16kcal/mol\n')
        for index1 in f1.index:
            miRNA_pattern = f1.loc[index1]['miRNA_pattern']
            target_pattern = f1.loc[index1]['element_pattern']
            if (miRNA_pattern[:8] == '((((((((' and target_pattern[-8:] == '))))))))') or (
                    miRNA_pattern[:8] == '.(((((((' and target_pattern[-8:] == '))))))).'):  # allow P1 pairing
                if (('(((((((' in miRNA_pattern[-8:]) and (')))))))' in target_pattern[:8])) or (
                        '(((((((((' in miRNA_pattern[9:] and ')))))))))' in target_pattern[:-9]):  # allow p2 pairing
                    if abs(len(target_pattern) - len(miRNA_pattern)) <= 6:  # allow bulge less than 6nt
                        each_line1 = '\t'.join([str(x) for x in f1.loc[index1]])
                        f2.write(f"{each_line1}\n")
        f2.close()

class Compressed_table():  # current, this code only surpport 1 abundance, because i want to sum all abundance of similiar element

    def miRNA_element_range(self, list1):
        list_cluster = []
        lowest_num, maximum_num = 0, 0
        for number1 in sorted(list(list1)):
            if (lowest_num == 0) and (maximum_num == 0):
                lowest_num, maximum_num = number1, number1
            else:
                if int(number1) - 1 == maximum_num:
                    maximum_num = int(number1)
                elif int(number1) - 1 != maximum_num:
                    cluster1 = f'{lowest_num}-{maximum_num}'
                    list_cluster.append(cluster1)
                    lowest_num, maximum_num = number1, number1
        cluster1 = f'{lowest_num}-{maximum_num}'
        list_cluster.append(cluster1)
        return list_cluster

    def compressed_each_element(self, dict1):
        highest_abundance_each_hyb = 0
        highest_abundance_hyb_name = ''
        total_abundance_each_hyb = 0
        for each_hyb, abundance in dict1.items():
            if highest_abundance_each_hyb < abundance:
                highest_abundance_each_hyb = abundance
                highest_abundance_hyb_name = each_hyb
            total_abundance_each_hyb += abundance
        return highest_abundance_hyb_name, total_abundance_each_hyb

    def compressed_same_index_table_to_dict(self, table, compressed_index):
        dict_compressed_table = {}
        for index1 in compressed_index:
            dict_compressed_table[index1] = int(table.loc[index1].sum())
        return dict_compressed_table

    def files(self, input):
        input_table = input + '.txt'
        output = input_table.replace('.txt', '_compressed.txt')
        if os.path.exists(output):
            os.remove(output)

        f1 = pd.read_table(input_table,
                           index_col=["miRNA_name", "miRNA_sequence", "miRNA_pattern", "Gene_ID",
                                      "element_sequence", "element_pattern", "dG",
                                      "genome_position", "Conservation_score"])
        mask_dG = f1.index.get_level_values('dG') <= -11.1
        f1 = f1[mask_dG]# 应用布尔索引，删除 dG > -11.1 的hybrids

        f1 = (f1[['Gene_information', 'abundance']])
        f1['Gene_name'] = f1['Gene_information'].str.split('#', expand=True)[0]
        f1['Gene_type'] = f1['Gene_information'].str.split('#', expand=True)[7]
        f1['Chromosome'] = f1['Gene_information'].str.split('#', expand=True)[1]
        f1['Strand'] = f1['Gene_information'].str.split('#', expand=True)[4]
        f1.drop(columns=['Gene_information'], inplace=True)
        f1.set_index('Gene_type', append=True, inplace=True)
        f1.set_index('Gene_name', append=True, inplace=True)
        f1.set_index('Chromosome', append=True, inplace=True)
        f1.set_index('Strand', append=True, inplace=True)

        ###### 这一部分代码就是提取所有的文件index， 然后来压缩相同类型的hybrids
        f_genome_position_NaN_index_compressed = set()  # index中存在 NaN 或者 “multiple_elements”， 这部分文件没有被压缩
        f_genome_position_NaN_index_compressed_str = set()  # the index is set as string, if not set as string, i found there can be same index1 in the set()
        f_normal_index_compressed = set()  # make a compressed list
        f_normal_index_compressed_str = set()  # the index is set as string, if not set as string, i found there can be same index1 in the set()
        for index1 in f1.index:
            if (np.nan in index1) or ('multiple_elements' in index1):
                if str(index1) not in f_genome_position_NaN_index_compressed_str:
                    f_genome_position_NaN_index_compressed_str.update({
                        str(index1)})  ## this set only for checking the index, if index name is same, do not put real index into f_genome_position_NaN_index_compressed
                    f_genome_position_NaN_index_compressed.update({index1})
            if (np.nan not in index1) and ('multiple_elements' not in index1):
                if str(index1) not in f_normal_index_compressed_str:
                    f_normal_index_compressed_str.update({str(index1)})
                    f_normal_index_compressed.update({index1})

        #######
        f_genome_position_NaN_index = list(f_genome_position_NaN_index_compressed)
        f_genome_position_NaN = (f1.loc[f_genome_position_NaN_index])
        dict_f_genome_position_NaN = self.compressed_same_index_table_to_dict(table=f_genome_position_NaN,
                                                                              compressed_index=f_genome_position_NaN_index)  ## compressecd multiple element and no genome position table
        #### 以下部分代码是先写入index 有NaA 或者 “Multiple index”的hyrbids，这部分hybrids没有被压缩
        f_output = open(output, 'a+')  ##output Nan conservation table
        f_output.write(
            f'miRNA_name\tmiRNA_sequence\tmiRNA_pattern\tGene_ID\telement_sequence\telement_pattern\tdG\tgenome_position\tConservation_score\tGene_type\tGene_name\tChromosome\tStrand\tabundance\n')
        for index1, abundance1 in dict_f_genome_position_NaN.items():  # miRNA_site_ranges_dict: {'137-148':{each_hyb: abundance}}
            each_hyb_list = [str(x) for x in index1]
            each_hyb = '\t'.join((each_hyb_list))
            f_output.write(f'{each_hyb}\t{abundance1}\n')
        f_output.close()

        ##### 以下这部分 是对于 绝大多数 的hybrids 进行潜在的 压缩
        f_normal_index_compressed = list(f_normal_index_compressed)
        f_normal = f1.loc[f_normal_index_compressed]  ##for most of hybrids, including genome position
        dict_f_normal = self.compressed_same_index_table_to_dict(table=f_normal,
                                                                 compressed_index=f_normal_index_compressed)
        dict_miRNA_target_chromosome_position = {}  ## 每个miRNA-target-染色体 作为一个整体， e.g. {'miRNA_target_chromosome': {3,4,5,6,7,8}'}，  目的是将一些 target element 残缺的序列合并到完整的miRNA-target hybrids 中去
        for index1, abundance in dict_f_normal.items():
            # for loop 1st, collect all miRNA binding position in the genome
            miRNA_name1 = index1[0]
            gene_id1 = index1[3]
            chromosome1 = index1[11]
            miRNA_geneID_chr = '_'.join([miRNA_name1, gene_id1, chromosome1])
            miRNA_site_genome_set = set(int(x) for x in re.findall(r'\d+', index1[7]))
            miRNA_site_genome_min = int(min(miRNA_site_genome_set))
            miRNA_site_genome_max = int(max(miRNA_site_genome_set))
            dict_miRNA_target_chromosome_position[miRNA_geneID_chr] = dict_miRNA_target_chromosome_position.get(
                miRNA_geneID_chr, set())
            dict_miRNA_target_chromosome_position[miRNA_geneID_chr].update(
                set(range(miRNA_site_genome_min,
                          miRNA_site_genome_max + 1)))  ## this miRNA element region including bulge position
        dict_hyb_abundance = {}  ## combine all hybrids in this dictionary, determine which is the highest abundance one element position in the genome, e.g. {'miRNA_target_chromosome': {'3452-3476': {hyb_name: abundance}}'}
        for index1, abundance in dict_f_normal.items():
            # for loop 2nd, collect each_hyb into element range e.g. {'3452-3476': {hyb_name: abundance}
            chromosome1 = index1[11]
            each_hyb_list = [str(x) for x in index1]
            each_hyb = '\t'.join(each_hyb_list)
            each_hyb_abundance = abundance
            element_position_in_genome = set([int(x) for x in re.findall(r'\d+', index1[7])])
            miRNA_name1 = index1[0]
            gene_id1 = index1[3]
            miRNA_geneID_chr = '_'.join([miRNA_name1, gene_id1, chromosome1])
            list_hyb_position = self.miRNA_element_range(dict_miRNA_target_chromosome_position[
                                                             miRNA_geneID_chr])  ## def, calculate the lowest and highest position in the genome, ['134-156', '167-178']
            for element_range in list_hyb_position:  ## e.g. element_range : '123-145'
                # inner of 2nd for loop
                miRNA_site_range_set = set(range(int(element_range.split('-')[0]), int(
                    element_range.split('-')[1]) + 1))  ##In the each_hyb, there could be multiple range e.g.(167-178),
                if miRNA_site_range_set.intersection(
                        element_position_in_genome) != set():  # Does the element binding site in each row & one of multiple element_range from genome
                    dict_hyb_abundance[miRNA_geneID_chr] = dict_hyb_abundance.get(miRNA_geneID_chr, {})
                    dict_hyb_abundance[miRNA_geneID_chr][element_range] = dict_hyb_abundance[miRNA_geneID_chr].get(
                        element_range, {})
                    dict_hyb_abundance[miRNA_geneID_chr][element_range][each_hyb] = \
                        dict_hyb_abundance[miRNA_geneID_chr][element_range].get(each_hyb, 0)
                    dict_hyb_abundance[miRNA_geneID_chr][element_range][each_hyb] += each_hyb_abundance
        f_output = open(output, 'a+')
        for miRNA_geneID_chr, element_ranges_dict in dict_hyb_abundance.items():
            for each_element_range, each_hyb_dict in element_ranges_dict.items():  ## element_ranges_dict: {'137-148':{each_hyb1: abundance,each1_hyb2: abundance2},' 152-167':{each_hyb: abundance} }
                highest_abundance_hyb_name = self.compressed_each_element(each_hyb_dict)[0]
                total_abundance_each_hyb = self.compressed_each_element(each_hyb_dict)[1]
                f_output.write(f'{highest_abundance_hyb_name}\t{total_abundance_each_hyb}\n')
        f_output.close()
        print("Step II done.\n")

    def potential_miRNA_identification(self, input,premiRNA_database):
        try:
            with open(f"{premiRNA_database}") as f1:
                contents = f1.read()
            f1 = pd.read_table(f"{input}_compressed.txt")

            for index, each_row in f1.iterrows():
                if each_row['element_sequence'] in contents:
                    f1.at[index, 'Gene_type'] = 'potential_microRNA'

            # 保存新的 pandas table 文件
            f1.to_csv(f"{input}_miRNA_identification.txt", sep='\t', index=False)
            print("Step III done.\n")
        except Exception as e:
            logging.error("Error occurred during step III, potential miRNA identification", exc_info=True)
            raise

class Gene_region():
    def __init__(self, ensemble_database=None):
        self.ensemble_database = ensemble_database

    def geneID_transcriptID_CDS_exon(self, file):  # including CDS and exon position
        dict_geneID_transcriptID_CDS = {}
        with open(file, 'r+') as f1:
            for line1 in f1:
                if 'protein_coding' in line1:
                    line2 = line1.strip().split('|')
                    Gene_ID = line2[0][1:]
                    transcript_ID = line2[1]
                    strand = line2[7]
                    exon_left_list = line2[3]
                    exon_right_list = line2[4]
                    CDS_left_list = line2[5]
                    CDS_right_list = line2[6]
                    if CDS_left_list != '':
                        target_exons_genome_start_sites = sorted(
                            int(x) for x in exon_left_list.split(';'))
                        target_exons_genome_end_sites = sorted(
                            int(x) for x in exon_right_list.split(';'))
                        target_CDS_genome_start_sites = sorted(
                            int(x) for x in CDS_left_list.split(';'))
                        target_CDS_genome_end_sites = sorted(
                            int(x) for x in CDS_right_list.split(';'))

                        dict_geneID_transcriptID_CDS[Gene_ID] = dict_geneID_transcriptID_CDS.get(Gene_ID, {})
                        dict_geneID_transcriptID_CDS[Gene_ID][transcript_ID + '_' + strand] = dict_geneID_transcriptID_CDS[Gene_ID].get(transcript_ID + '_' + strand,
                                                                      {'CDSs': set(), 'Exons': set()})

                        for exon_each in zip(target_exons_genome_start_sites, target_exons_genome_end_sites):
                            dict_geneID_transcriptID_CDS[Gene_ID][transcript_ID + '_' + strand]['Exons'].update(
                                set(range(exon_each[0], exon_each[1] + 1)))
                        for CDS_each in zip(target_CDS_genome_start_sites, target_CDS_genome_end_sites):
                            dict_geneID_transcriptID_CDS[Gene_ID][transcript_ID + '_' + strand]['CDSs'].update(
                                set(range(CDS_each[0], CDS_each[1] + 1)))
        return dict_geneID_transcriptID_CDS

    def table(self, input):
        input_table = input + '_miRNA_identification.txt'
        output = input_table.replace('_miRNA_identification.txt', '_region.txt')
        if os.path.exists(output):
            os.remove(output)
        dict_cds = self.geneID_transcriptID_CDS_exon(file=self.ensemble_database)
        with open(input_table, 'r+') as f1:
            line1 = f1.readlines()
            line1st = line1[0]
            line_other = line1[1:]

        f2 = open(output, 'a+')
        f2.write(line1st.rstrip('\n') + '\t' + 'element_region' + '\n')
        for each_row in line_other:
            index1 = each_row.rstrip('\n').split('\t')
            element_position = set(int(x) for x in re.findall(r'\d+', index1[7]))
            list_region = []
            geneID = index1[3]
            if (element_position != set()) and ('mRNA' == index1[9]):
                if geneID in dict_cds:
                    transcriptName_list = dict_cds[geneID]
                    for transcriptName_strand in transcriptName_list:
                        strand = transcriptName_strand.split('_')[1]
                        CDS_region_set = dict_cds[geneID][transcriptName_strand]['CDSs']
                        exon_region_set = dict_cds[geneID][transcriptName_strand]['Exons']
                        if exon_region_set.intersection(
                                element_position) != set():  ## the element in the exon region, cds or utr,
                            if CDS_region_set.intersection(
                                    element_position) != set():  # the transcript exon in genome should overlap with target element
                                list_region.append('CDS')
                            if strand == '-1':
                                if max(element_position) < min(CDS_region_set):
                                    list_region.append('3UTR')
                                if min(element_position) > max(CDS_region_set):
                                    list_region.append('5UTR')
                            if strand == '1':
                                if min(element_position) > max(CDS_region_set):
                                    list_region.append('3UTR')
                                if max(element_position) < min(CDS_region_set):
                                    list_region.append('5UTR')
                    if list_region == []:
                        list_region.append(
                            'intron')  ## this is what i guess, some element in the exon, but not in all transcripts CDS
                    list_region_str = ';'.join(sorted(set(list_region)))
                    f2.write(each_row.rstrip('\n') + '\t' + str(list_region_str) + '\n')
                elif geneID not in dict_cds:  ## not mRNA
                    f2.write(f'{each_row}')
            else:
                f2.write(f'{each_row}')
        f2.close()
        print("Step IV done.\n")

class Statistic(): ## CLA, CLASH fasta; CLQ, CLASH fastq; CUR, Cumulative fraction Curve; msq: miRNA-seq
    def reorder_geneCountFileColumn(self):
        f1 = pd.read_csv("coldata_SampleName.csv", index_col=[0])
        samples_list = list(f1.index)
        f2 = pd.read_csv("gene_count.csv", index_col=[0])
        gene_count_reordered = f2[samples_list]  # new order for gene_count
        # 去掉 gene_id 中的 '|' 后面部分
        gene_count_reordered.index = gene_count_reordered.index.str.split('|').str[0]
        gene_count_reordered.to_csv('gene_count_reordered.csv')

    def miSeq_fasta_log(self, JobID1, Output_filename1):
        # 计算miRNA 最终有多少counts
        f1 = pd.read_csv(f"{Output_filename1}.mirnaCount.csv")
        total_raw_count = f1['rawCount'].sum()

        with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as f1:
            allines = f1.read()
            log_data = {}
            log_data['Clean_fasta_reads_count'] = int(
                re.search(r'Total reads in the raw FASTA file is\s+([\d,]+)', allines).group(1).replace(',', ''))
            log_data['miRNAseq_count'] = total_raw_count

        # 生成readCounts表格
        readCounts_summary = pd.DataFrame({
            'Data type': ['Clean fasta', 'microRNA counts'],
            'Read Counts': [log_data['Clean_fasta_reads_count'], log_data['miRNAseq_count']]
        })
        readCounts_html_table = readCounts_summary.to_html(index=False, classes='table table-striped')

        # 生成readCounts的柱状图
        fig_log_summary = px.bar(readCounts_summary, x='Data type', y='Read Counts', title="Read Counts",
                                 text='Read Counts')
        fig_log_summary.update_layout(
            font=dict(
                family="Arial, sans-serif",
                size=16  # 设置统一的字体大小
            ),
            xaxis_title=None,
            yaxis_title=None,
            showlegend=False
        )
        readCount_html_barChart = fig_log_summary.to_html(full_html=False)

        # 绘制HTML模板
        template = Template("""

         <!DOCTYPE html>
         <html>
         <head>
             <title>CLASH Analysis Report</title>
             <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
             <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
             <style>
                 body {
                     font-family: Arial, sans-serif;
                     margin: 20px;
                     font-size: 16px; /* 设置统一的字体大小 */
                 }
                 h1, h2, ul {
                     font-size: 16px; /* 确保标题和列表的字体大小一致 */
                 }
                 h1 {
                     color: #333;
                     text-align: center; /* 居中对齐 */
                     font-size: 24px; /* 加大字体 */
                     font-weight: bold; /* 加粗 */
                 }
                 h2 {
                     color: #333;
                 }
                 table {
                     width: 100px; /* 设置整个表格的宽度 */
                     text-align: left;
                     table-layout: fixed; /* 确保表格布局固定 */
                 }
                 table th, table td {
                     text-align: left; /* 设置表头左对齐 */
                     width: 20px; /* 设置每列固定宽度 */
                 }
                 .row {
                     margin-bottom: 20px; /* 增加行之间的间距 */
                 }
             </style>
         </head>
         <body>
             <h1>CLASH Analysis Report for Job ID: {{ JobID1 }}</h1>

             <div class="row" style="display: flex; align-items: center;">
                 <div class="col-md-6">
                     <h2>Data Processing Summary</h2>
                     <table class="table table-striped data-summary">
                         {{ readCounts_html_table_content | safe }}
                     </table>
                 </div>
                 <div class="col-md-6">
                     <div>{{ readCount_html_barChart_content | safe }}</div>
                 </div>
             </div>
         </body>
         </html>


         """)

        # 渲染HTML
        html_content = template.render(
            JobID1=JobID1,
            readCounts_html_table_content=readCounts_html_table,
            readCount_html_barChart_content=readCount_html_barChart,
        )

        with open(f"{Output_filename1}_analysis_report.html", "w") as f:
            f.write(html_content)

        print("HTML report generated successfully.")

    def aqPE_data_report(self, JobID1):
        try:
            jobID = JobID1
            os.chdir(f"/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/{jobID}/")

            f1 = pd.read_csv(f"AllSample_RawCount.csv", index_col=[0])
            miRNA_total_final_count = (f1.sum())# 计算miRNA 最终有多少counts
            with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as log_file:
                log_content = log_file.read()
            output_file_name_list = re.findall(r'output file name:\s*([\w\-\.]+)', log_content, re.MULTILINE)
            total_reads_list = [int(x.replace(',', ''))  for x in
                                re.findall(r'Total read pairs processed:\s+([\d,]+)', log_content, re.MULTILINE)]
            trimmed_reads_list = [int(x.replace(',', ''))  for x in
                                  re.findall(r'Pairs written \(passing filters\):\s+([\d,]+)', log_content,
                                             re.MULTILINE)]

            collapsed_reads_list = [int(x.replace(',', '')) for x in
                                    re.findall(r'Reads written \(passing filters\):\s+([\d,]+)', log_content,
                                               re.MULTILINE)]

            species = re.search(r"miR-seq Species: ([\w\.]+)", log_content).group(1)
            email = re.search(r"miR-seq email: ([\w@.]+)", log_content).group(1)
            adapter_5_prime = re.findall(r'Five Prime Adapter: (\w+)', log_content,
                                         re.MULTILINE)
            adapter_3_prime = re.findall(r'Three Prime Adapter: (\w+)', log_content,
                                         re.MULTILINE)
            input1_files = re.findall(
                r'Input fastq1:\s+/pubapps/mingyi\.xie/clashhub/prod/app/TemporaryStorage/[\w\-]+/([\w\-\.]+\.fastq\.gz)',
                log_content,
                re.MULTILINE)
            input2_files = re.findall(
                r'Input fastq2:\s+/pubapps/mingyi\.xie/clashhub/prod/app/TemporaryStorage/[\w\-]+/([\w\-\.]+\.fastq\.gz)',
                log_content,
                re.MULTILINE)

            miRNA_final_count_list = [miRNA_total_final_count[each_output] for each_output in output_file_name_list]

            print(f"Your email: {email}")
            print(f"Your species: {species}")
            print(f"Each of your input fastq1 name: {input1_files}")
            print(f"Each of your input fastq2 name: {input2_files}")
            print(f"Each of your input 5' adapter: {adapter_5_prime}")
            print(f"Each of your input 3' adapter: {adapter_3_prime}")
            print(f"Each of your raw reads number: {total_reads_list}")
            print(f"Each of your trimmed reads number: {trimmed_reads_list}")
            print(f"Each of your collapsed reads number: {collapsed_reads_list}")
            print(f"Each of your output file name: {output_file_name_list}")
            print(f"Each of miRNA final coubt: {miRNA_final_count_list}")

            # 创建DataFrame
            data = {
                'Sample': output_file_name_list,
                'Input File1': input1_files,
                'Input File2': input2_files,
                '5\' adapter': adapter_5_prime,
                '3\' adapter': adapter_3_prime,
                'Total Reads': total_reads_list,
                'Trimmed Reads': trimmed_reads_list,
                'Collapsed Reads': collapsed_reads_list,
                'Aligned Reads': miRNA_final_count_list
            }

            df = pd.DataFrame(data)

            # 只显示Total Reads, Trimmed Reads, Aligned Reads数据的柱状图
            df_melted = df.melt(id_vars=['Sample'], value_vars=['Total Reads', 'Trimmed Reads','Collapsed Reads', 'Aligned Reads'],
                                var_name='Read Type', value_name='Read Counts')
            fig = px.bar(df_melted, x='Sample', y='Read Counts', color='Read Type', barmode='group',
                         title='Read Counts Barchart', text='Read Counts')
            fig.update_layout(
                font=dict(
                    family="Arial, sans-serif",
                    size=16
                ),
                xaxis_title=None,
                yaxis_title=None,
                showlegend=True
            )
            readCount_html_barChart = fig.to_html(full_html=False)

            # 生成HTML内容模板
            template = Template("""
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>miRNA-seq Report</title>
                            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    margin: 20px;
                                    font-size: 16px;
                                }
                                h1 {
                                    color: #333;
                                    text-align: center;
                                    font-size: 24px;
                                    font-weight: bold;
                                }
                                h2 {
                                    color: #333;
                                    font-size: 18px;
                                }
                                table {
                                    width: 100%;
                                    text-align: left;
                                    table-layout: auto;
                                }
                                table th, table td {
                                    text-align: left;
                                }
                                table th {
                                    background-color: white;
                                    color: #333;
                                    border-bottom: 2px solid #dee2e6;
                                }
                                .row {
                                    margin-bottom: 20px;
                                }
                                .chart-container img {
                                    max-width: 100%;
                                    height: auto;
                                }
                                .table-striped tbody tr:nth-of-type(odd) {
                                    background-color: rgba(0, 0, 0, 0.05);
                                }
                            </style>
                        </head>
                        <body>
                            <h1>miRNA-seq Analysis Report for Job ID: {{ jobID }}</h1>
                            <div class="row" style="display: flex; align-items: center;">
                                <div class="col-md-6">
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your email</div>
                                        <div class="col-md-8">{{ email }}</div>
                                    </div>
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your species</div>
                                        <div class="col-md-8">{{ species }}</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div>{{ readCount_html_barChart_content | safe }}</div>
                                </div>
                            </div>

                            <h2>Data Processing Summary</h2>
                            <table class="table table-striped">
                                {{ table_content }}
                            </table>

                        </body>
                        </html>
                        """)

            # 渲染HTML
            html_content = template.render(
                jobID=jobID,
                email=email,
                species=species,
                input1_files=input1_files,
                input2_files=input2_files,
                adapter_5_prime=adapter_5_prime,
                adapter_3_prime=adapter_3_prime,
                samples_list=output_file_name_list,
                table_content=df.to_html(classes='table table-striped', index=False, escape=False),
                readCount_html_barChart_content=readCount_html_barChart
            )

            # 保存HTML内容到文件
            with open('mirnaseq_Analysis_Report.html', 'w') as f:
                f.write(html_content)

            print("HTML report generated successfully from python code.")
        except Exception as e:
            print(f"An error occurred: {e}")

    def aqSE_data_report(self, JobID1):
        try:
            jobID = JobID1
            os.chdir(f"/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/{jobID}/")

            f1 = pd.read_csv(f"AllSample_RawCount.csv", index_col=[0])
            miRNA_total_final_count = (f1.sum())# 计算miRNA 最终有多少counts
            with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as log_file:
                log_content = log_file.read()
            output_file_name_list = re.findall(r'output file name:\s*([\w\-\.]+)', log_content, re.MULTILINE)
            total_reads_list = [int(x.replace(',', ''))  for x in
                                re.findall(r'Total reads processed:\s+([\d,]+)', log_content, re.MULTILINE)][0::2]# 因为有cutadapt -u 4 -u 4，要去掉这些，所以用了[0::2]
            trimmed_reads_list = [int(x.replace(',', ''))  for x in
                                  re.findall(r'Reads written \(passing filters\):\s+([\d,]+)', log_content, re.MULTILINE)][0::2] # 因为有cutadapt -u 4 -u 4，要去掉这些，所以用了[0::2]
            collapsed_reads_list = [int(x.replace(',', '')) for x in
                                  re.findall(r'Reads written \(passing filters\):\s+([\d,]+)', log_content,
                                             re.MULTILINE)][1::2]
            species = re.search(r"miR-seq Species: ([\w\.]+)", log_content).group(1)
            email = re.search(r"miR-seq email: ([\w@.]+)", log_content).group(1)
            adapter_3_prime = re.findall(r'Three Prime Adapter: (\w+)', log_content,
                                         re.MULTILINE)
            input1_files = re.findall(
                r'Input fastq1:\s+/pubapps/mingyi\.xie/clashhub/prod/app/TemporaryStorage/[\w\-]+/([\w\-\.]+\.fastq\.gz)',
                log_content,re.MULTILINE)

            miRNA_final_count_list = [int(miRNA_total_final_count[each_output]) for each_output in output_file_name_list]

            print(f"Your email: {email}")
            print(f"Your species: {species}")
            print(f"Each of your input fastq1 name: {input1_files}")
            print(f"Each of your input 3' adapter: {adapter_3_prime}")
            print(f"Each of your raw reads number: {total_reads_list}")
            print(f"Each of your trimmed reads number: {trimmed_reads_list}")
            print(f"Each of your collapsed reads number: {collapsed_reads_list}")
            print(f"Each of your output file name: {output_file_name_list}")
            print(f"Each of miRNA final coubt: {miRNA_final_count_list}")

            # 创建DataFrame
            data = {
                'Sample': output_file_name_list,
                'Input File1': input1_files,
                '3\' adapter': adapter_3_prime,
                'Total Reads': total_reads_list,
                'Trimmed Reads': trimmed_reads_list,
                'Collapsed Reads': collapsed_reads_list,
                'Aligned Reads': miRNA_final_count_list
            }

            df = pd.DataFrame(data)

            # 只显示Total Reads, Trimmed Reads, Aligned Reads数据的柱状图
            df_melted = df.melt(id_vars=['Sample'], value_vars=['Total Reads', 'Trimmed Reads','Collapsed Reads', 'Aligned Reads'],
                                var_name='Read Type', value_name='Read Counts')
            fig = px.bar(df_melted, x='Sample', y='Read Counts', color='Read Type', barmode='group',
                         title='Read Counts Barchart', text='Read Counts')
            fig.update_layout(
                font=dict(
                    family="Arial, sans-serif",
                    size=16
                ),
                xaxis_title=None,
                yaxis_title=None,
                showlegend=True
            )
            readCount_html_barChart = fig.to_html(full_html=False)

            # 生成HTML内容模板
            template = Template("""
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>miRNA-seq Report</title>
                            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    margin: 20px;
                                    font-size: 16px;
                                }
                                h1 {
                                    color: #333;
                                    text-align: center;
                                    font-size: 24px;
                                    font-weight: bold;
                                }
                                h2 {
                                    color: #333;
                                    font-size: 18px;
                                }
                                table {
                                    width: 100%;
                                    text-align: left;
                                    table-layout: auto;
                                }
                                table th, table td {
                                    text-align: left;
                                }
                                table th {
                                    background-color: white;
                                    color: #333;
                                    border-bottom: 2px solid #dee2e6;
                                }
                                .row {
                                    margin-bottom: 20px;
                                }
                                .chart-container img {
                                    max-width: 100%;
                                    height: auto;
                                }
                                .table-striped tbody tr:nth-of-type(odd) {
                                    background-color: rgba(0, 0, 0, 0.05);
                                }
                            </style>
                        </head>
                        <body>
                            <h1>miRNA-seq Analysis Report for Job ID: {{ jobID }}</h1>
                            <div class="row" style="display: flex; align-items: center;">
                                <div class="col-md-6">
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your email</div>
                                        <div class="col-md-8">{{ email }}</div>
                                    </div>
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your species</div>
                                        <div class="col-md-8">{{ species }}</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div>{{ readCount_html_barChart_content | safe }}</div>
                                </div>
                            </div>

                            <h2>Data Processing Summary</h2>
                            <table class="table table-striped">
                                {{ table_content }}
                            </table>

                        </body>
                        </html>
                        """)

            # 渲染HTML
            html_content = template.render(
                jobID=jobID,
                email=email,
                species=species,
                input1_files=input1_files,
                adapter_3_prime=adapter_3_prime,
                samples_list=output_file_name_list,
                table_content=df.to_html(classes='table table-striped', index=False, escape=False),
                readCount_html_barChart_content=readCount_html_barChart
            )

            # 保存HTML内容到文件
            with open('mirnaseq_Analysis_Report.html', 'w') as f:
                f.write(html_content)

            print("HTML report generated successfully from python code.")
        except Exception as e:
            print(f"An error occurred: {e}")

    def aqCR_data_report(self, JobID1):
        try:
            jobID = JobID1
            os.chdir(f"/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/{jobID}/")

            f1 = pd.read_csv(f"AllSample_RawCount.csv", index_col=[0])
            miRNA_total_final_count = (f1.sum())# 计算miRNA 最终有多少counts
            with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as log_file:
                log_content = log_file.read()
            output_file_name_list = re.findall(r'output file name:\s*([\w\-\.]+)', log_content, re.MULTILINE)
            total_reads_list = [int(x.replace(',', ''))  for x in
                                re.findall(r'Total reads in the raw FASTA file is\s+([\d,]+)', log_content, re.MULTILINE)]

            species = re.search(r"miR-seq Species: ([\w\.]+)", log_content).group(1)
            email = re.search(r"miR-seq email: ([\w@.]+)", log_content).group(1)
            input1_files = re.findall(
                r'Input fasta:\s+/pubapps/mingyi\.xie/clashhub/prod/app/TemporaryStorage/[\w\-]+/([\w\-\.]+\.fasta\.gz)',
                log_content,re.MULTILINE)

            miRNA_final_count_list = [miRNA_total_final_count[each_output] for each_output in output_file_name_list]

            print(f"Your email: {email}")
            print(f"Your species: {species}")
            print(f"Each of your input fasta name: {input1_files}")
            print(f"Each of your raw reads number: {total_reads_list}")
            print(f"Each of your output file name: {output_file_name_list}")
            print(f"Each of miRNA final count: {miRNA_final_count_list}")

            # 创建DataFrame
            data = {
                'Sample': output_file_name_list,
                'Input File1': input1_files,
                'Total Reads': total_reads_list,
                'Aligned Reads': miRNA_final_count_list
            }

            df = pd.DataFrame(data)

            # 只显示Total Reads, Trimmed Reads, Aligned Reads数据的柱状图
            df_melted = df.melt(id_vars=['Sample'], value_vars=['Total Reads', 'Aligned Reads'],
                                var_name='Read Type', value_name='Read Counts')
            fig = px.bar(df_melted, x='Sample', y='Read Counts', color='Read Type', barmode='group',
                         title='Read Counts Barchart', text='Read Counts')
            fig.update_layout(
                font=dict(
                    family="Arial, sans-serif",
                    size=16
                ),
                xaxis_title=None,
                yaxis_title=None,
                showlegend=True
            )
            readCount_html_barChart = fig.to_html(full_html=False)

            # 生成HTML内容模板
            template = Template("""
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>miRNA-seq Report</title>
                            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    margin: 20px;
                                    font-size: 16px;
                                }
                                h1 {
                                    color: #333;
                                    text-align: center;
                                    font-size: 24px;
                                    font-weight: bold;
                                }
                                h2 {
                                    color: #333;
                                    font-size: 18px;
                                }
                                table {
                                    width: 100%;
                                    text-align: left;
                                    table-layout: auto;
                                }
                                table th, table td {
                                    text-align: left;
                                }
                                table th {
                                    background-color: white;
                                    color: #333;
                                    border-bottom: 2px solid #dee2e6;
                                }
                                .row {
                                    margin-bottom: 20px;
                                }
                                .chart-container img {
                                    max-width: 100%;
                                    height: auto;
                                }
                                .table-striped tbody tr:nth-of-type(odd) {
                                    background-color: rgba(0, 0, 0, 0.05);
                                }
                            </style>
                        </head>
                        <body>
                            <h1>miRNA-seq Analysis Report for Job ID: {{ jobID }}</h1>
                            <div class="row" style="display: flex; align-items: center;">
                                <div class="col-md-6">
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your email</div>
                                        <div class="col-md-8">{{ email }}</div>
                                    </div>
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your species</div>
                                        <div class="col-md-8">{{ species }}</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div>{{ readCount_html_barChart_content | safe }}</div>
                                </div>
                            </div>

                            <h2>Data Processing Summary</h2>
                            <table class="table table-striped">
                                {{ table_content }}
                            </table>

                        </body>
                        </html>
                        """)

            # 渲染HTML
            html_content = template.render(
                jobID=jobID,
                email=email,
                species=species,
                input1_files=input1_files,
                samples_list=output_file_name_list,
                table_content=df.to_html(classes='table table-striped', index=False, escape=False),
                readCount_html_barChart_content=readCount_html_barChart
            )

            # 保存HTML内容到文件
            with open('mirnaseq_Analysis_Report.html', 'w') as f:
                f.write(html_content)

            print("HTML report generated successfully from python code.")
        except Exception as e:
            print(f"An error occurred: {e}")

    def CLASH_fastq_log(self,JobID1, Output_filename1):
        try:
            with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as f1:
                allines = f1.read()
                log_data = {}
                log_data['Raw_fastq_reads_count'] = int(
                    re.search(r'Total read pairs processed:\s+([\d,]+)', allines).group(1).replace(',', ''))
                log_data['Raw_fastq_trimmed_reads_count'] = int(
                    re.search(r'Pairs written \(passing filters\):\s+([\d,]+)', allines).group(1).replace(',', ''))
                log_data['Assembled_fastq_count'] = int(
                    re.search(r'Assembled reads\s+\.+:\s+([\d,]+)', allines).group(1).replace(',', ''))
                log_data['Collapsed_fasta_count'] = int(
                    re.search(r'Total reads processed:\s+([\d,]+)', allines).group(1).replace(',', ''))

            # 生成readCounts表格
            readCounts_summary = pd.DataFrame({
                'Data type': ['Raw fastq', 'Adapter trimmed fastq', 'Assembled fastq', 'Collapsed fasta'],
                'Read Counts': [log_data['Raw_fastq_reads_count'], log_data['Raw_fastq_trimmed_reads_count'],
                                log_data['Assembled_fastq_count'], log_data['Collapsed_fasta_count']]
            })
            readCounts_html_table = readCounts_summary.to_html(index=False, classes='table table-striped')

            # 生成readCounts的柱状图
            fig_log_summary = px.bar(readCounts_summary, x='Data type', y='Read Counts', title="Read Counts",
                                    text='Read Counts')
            fig_log_summary.update_layout(
                font=dict(
                    family="Arial, sans-serif",
                    size=16  # 设置统一的字体大小
                ),
                xaxis_title=None,
                yaxis_title=None,
                showlegend=False
            )
            readCount_html_barChart = fig_log_summary.to_html(full_html=False)

            # 生成rna type HTML表格
            f1 = pd.read_csv(f"{Output_filename1}_FinalResult.csv")
            rnaType_table = f1.groupby('Gene_type')['abundance'].sum().reset_index()
            rnaType_table.rename(columns={'Gene_type': 'Gene type', 'abundance': 'microRNA-target abundance'}, inplace=True)
            rnaType_table = rnaType_table.sort_values(by='microRNA-target abundance', ascending=False)  # 按abundance降序排序
            rnaType_html_table = rnaType_table.to_html(index=False, classes='table table-striped')

            # 绘制rna type pie图表
            fig = px.pie(rnaType_table, names='Gene type', values='microRNA-target abundance', title='RNA Types Ratio')
            fig.update_layout(
                font=dict(
                    family="Arial, sans-serif",
                    size=16  # 设置统一的字体大小
                ),
                showlegend=True
            )
            rnaType_html_pieChart = fig.to_html(full_html=False)

            # 绘制HTML模板
            template = Template("""

            <!DOCTYPE html>
            <html>
            <head>
                <title>CLASH Analysis Report</title>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        font-size: 16px; /* 设置统一的字体大小 */
                    }
                    h1, h2, ul {
                        font-size: 16px; /* 确保标题和列表的字体大小一致 */
                    }
                    h1 {
                        color: #333;
                        text-align: center; /* 居中对齐 */
                        font-size: 24px; /* 加大字体 */
                        font-weight: bold; /* 加粗 */
                    }
                    h2 {
                        color: #333;
                    }
                    table {
                        width: 100px; /* 设置整个表格的宽度 */
                        text-align: left;
                        table-layout: fixed; /* 确保表格布局固定 */
                    }
                    table th, table td {
                        text-align: left; /* 设置表头左对齐 */
                        width: 20px; /* 设置每列固定宽度 */
                    }
                    .row {
                        margin-bottom: 20px; /* 增加行之间的间距 */
                    }
                </style>
            </head>
            <body>
                <h1>CLASH Analysis Report for Job ID: {{ JobID1 }}</h1>

                <div class="row" style="display: flex; align-items: center;">
                    <div class="col-md-6">
                        <h2>Data Processing Summary</h2>
                        <table class="table table-striped data-summary">
                            {{ readCounts_html_table_content | safe }}
                        </table>
                    </div>
                    <div class="col-md-6">
                        <div>{{ readCount_html_barChart_content | safe }}</div>
                    </div>
                </div>

                <div class="row" style="display: flex; align-items: center;">
                    <div class="col-md-6">
                        <h2>RNA Types in CLASH</h2>
                        <table class="table table-striped rna-type">
                            {{ rnaType_html_table_content | safe }}
                        </table>
                    </div>
                    <div class="col-md-6">
                        <div>{{ rnaType_html_pieChart_content | safe }}</div>
                    </div>
                </div>
            </body>
            </html>


            """)

            # 渲染HTML
            html_content = template.render(
                JobID1=JobID1,
                readCounts_html_table_content=readCounts_html_table,
                readCount_html_barChart_content=readCount_html_barChart,
                rnaType_html_table_content=rnaType_html_table,
                rnaType_html_pieChart_content=rnaType_html_pieChart
            )

            with open(f"{Output_filename1}_analysis_report.html", "w") as f:
                f.write(html_content)

            print("HTML report generated successfully.")
        except Exception as e:
            logging.error("Error occurred during CLASH fasta HTML processing", exc_info=True)
            raise
    def CLASH_fasta_log(self,JobID1, Output_filename1):
        try:
            with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as f1:
                allines = f1.read()
                log_data = {}
                log_data['Clean_fasta_count'] = int(
                    re.search(r'Total reads in the raw FASTA file is\s+([\d,]+)', allines).group(1).replace(',', ''))

            # 生成readCounts表格
            readCounts_summary = pd.DataFrame({
                'Data type': ['Clean fasta'],
                'Read Counts': [log_data['Clean_fasta_count']]
            })
            readCounts_html_table = readCounts_summary.to_html(index=False, classes='table table-striped')

            # 生成readCounts的柱状图
            fig_log_summary = px.bar(readCounts_summary, x='Data type', y='Read Counts', title="Read Counts",
                                     text='Read Counts')
            fig_log_summary.update_layout(
                font=dict(
                    family="Arial, sans-serif",
                    size=16  # 设置统一的字体大小
                ),
                xaxis_title=None,
                yaxis_title=None,
                showlegend=False
            )
            readCount_html_barChart = fig_log_summary.to_html(full_html=False)

            # 生成rna type HTML表格
            f1 = pd.read_csv(f"{Output_filename1}_FinalResult.csv")
            rnaType_table = f1.groupby('Gene_type')['abundance'].sum().reset_index()
            rnaType_table.rename(columns={'Gene_type': 'Gene type', 'abundance': 'microRNA-target abundance'}, inplace=True)
            rnaType_table = rnaType_table.sort_values(by='microRNA-target abundance', ascending=False)  # 按abundance降序排序
            rnaType_html_table = rnaType_table.to_html(index=False, classes='table table-striped')

            # 绘制rna type pie图表
            fig = px.pie(rnaType_table, names='Gene type', values='microRNA-target abundance', title='RNA Types Ratio')
            fig.update_layout(
                font=dict(
                    family="Arial, sans-serif",
                    size=16  # 设置统一的字体大小
                ),
                showlegend=True
            )
            rnaType_html_pieChart = fig.to_html(full_html=False)

            # 绘制HTML模板
            template = Template("""
    
            <!DOCTYPE html>
            <html>
            <head>
                <title>CLASH Analysis Report</title>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        font-size: 16px; /* 设置统一的字体大小 */
                    }
                    h1, h2, ul {
                        font-size: 16px; /* 确保标题和列表的字体大小一致 */
                    }
                    h1 {
                        color: #333;
                        text-align: center; /* 居中对齐 */
                        font-size: 24px; /* 加大字体 */
                        font-weight: bold; /* 加粗 */
                    }
                    h2 {
                        color: #333;
                    }
                    table {
                        width: 100px; /* 设置整个表格的宽度 */
                        text-align: left;
                        table-layout: fixed; /* 确保表格布局固定 */
                    }
                    table th, table td {
                        text-align: left; /* 设置表头左对齐 */
                        width: 20px; /* 设置每列固定宽度 */
                    }
                    .row {
                        margin-bottom: 20px; /* 增加行之间的间距 */
                    }
                </style>
            </head>
            <body>
                <h1>CLASH Analysis Report for Job ID: {{ JobID1 }}</h1>
    
                <div class="row" style="display: flex; align-items: center;">
                    <div class="col-md-6">
                        <h2>Data Processing Summary</h2>
                        <table class="table table-striped data-summary">
                            {{ readCounts_html_table_content | safe }}
                        </table>
                    </div>
                    <div class="col-md-6">
                        <div>{{ readCount_html_barChart_content | safe }}</div>
                    </div>
                </div>
    
                <div class="row" style="display: flex; align-items: center;">
                    <div class="col-md-6">
                        <h2>RNA Types in CLASH</h2>
                        <table class="table table-striped rna-type">
                            {{ rnaType_html_table_content | safe }}
                        </table>
                    </div>
                    <div class="col-md-6">
                        <div>{{ rnaType_html_pieChart_content | safe }}</div>
                    </div>
                </div>
            </body>
            </html>
    
    
            """)

            # 渲染HTML
            html_content = template.render(
                JobID1=JobID1,
                readCounts_html_table_content=readCounts_html_table,
                readCount_html_barChart_content=readCount_html_barChart,
                rnaType_html_table_content=rnaType_html_table,
                rnaType_html_pieChart_content=rnaType_html_pieChart
            )

            with open(f"{Output_filename1}_analysis_report.html", "w") as f:
                f.write(html_content)

            print("HTML report generated successfully.")
        except Exception as e:
            logging.error("Error occurred during CLASH fasta HTML processing", exc_info=True)
            raise

    def data_report(self,JobID1, Output_filename1):
        if JobID1[:3] == "CLQ": # 这是 CLASH fastq
            self.CLASH_fastq_log(JobID1, Output_filename1)
        elif JobID1[:3] == "CLA": # 这是 CLASH fasta
            self.CLASH_fasta_log(JobID1, Output_filename1)

    def Deseq2_data_report(self, JobIDinput):
        jobID = JobIDinput
        os.chdir(f"/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/{jobID}/")

        f1 = pd.read_csv(f"coldata_SampleName.csv", index_col=[0])# 读取样本名称
        samples_list = list(f1.index)

        with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{jobID}.log", 'r') as log_file:# 读取日志文件内容
            log_content = log_file.read()

        # 提取读取数信息，并乘以2
        total_reads_list = [int(x.replace(',', '')) for x in
                            re.findall(r'Total read pairs processed:\s+([\d,]+)', log_content, re.MULTILINE)]
        trimmed_reads_list = [int(x.replace(',', '')) for x in
                              re.findall(r'Pairs written \(passing filters\):\s+([\d,]+)', log_content, re.MULTILINE)]

        # 提取每个样本的数据块
        sample_blocks = re.findall(r'Running HISAT2 for \w+.*?\n(.*?)\d+\.\d+% overall alignment rate', log_content,
                                   re.DOTALL)

        # 计算总对齐读取数
        def mapping_reads_number(block):
            paired_exactly_once = int(
                re.search(r'(\d+) \(\d+\.\d+%\) aligned concordantly exactly 1 time', block).group(1))
            paired_more_than_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned concordantly >1 times', block).group(1))
            discordantly_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned discordantly 1 time', block).group(1))
            unpaired_exactly_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned exactly 1 time', block).group(1))
            unpaired_more_than_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned >1 times', block).group(1))
            paired_aligned_reads = (paired_exactly_once + paired_more_than_once + discordantly_once) * 2
            unpaired_aligned_reads = unpaired_exactly_once + unpaired_more_than_once
            total_aligned_reads = int((paired_aligned_reads + unpaired_aligned_reads)/2) #我计算的平均每个fastq的mapping reads
            return total_aligned_reads

        total_aligned_reads_list = [mapping_reads_number(block) for block in sample_blocks]

        species = re.search(r"RNAseq Species: ([\w\.]+)", log_content).group(1)
        email = re.search(r"RNAseq email: ([\w@.]+)", log_content).group(1)
        control_count = re.search(r"RNAseq Control Sample Count: (\d+)", log_content).group(1)
        treatment_count = re.search(r"RNAseq Treatment Sample Count: (\d+)", log_content).group(1)
        adapter_5_prime = re.findall(r'RNAseq_(?:control|treatment)_FIVE_PRIME_ADAPTER_\d+=(\w+)', log_content,
                                     re.MULTILINE)
        adapter_3_prime = re.findall(r'RNAseq_(?:control|treatment)_THREE_PRIME_ADAPTER_\d+=(\w+)', log_content,
                                     re.MULTILINE)
        input1_files = re.findall(r'RNAseq_(?:control|treatment)_INPUT_FILE1_\d+=.*/([\w-]+)\.fastq\.gz', log_content, re.MULTILINE)
        input2_files = re.findall(r'RNAseq_(?:control|treatment)_INPUT_FILE2_\d+=.*/([\w-]+)\.fastq\.gz', log_content, re.MULTILINE)

        print(f"Your email: {email}")
        print(f"Your species: {species}")
        print(f"Total of your control sample number: {control_count}")
        print(f"Total of your treatment sample number: {treatment_count}")
        print(f"Each of your input fastq1 name: {input1_files}")
        print(f"Each of your input fastq2 name: {input2_files}")
        print(f"Each of your input 5' adapter: {adapter_5_prime}")
        print(f"Each of your input 3' adapter: {adapter_3_prime}")
        print(f"Each of your output file name: {samples_list}")
        print(f"Each of your raw reads number: {total_reads_list}")
        print(f"Each of your trimmed reads number: {trimmed_reads_list}")
        print(f"Each of your aligned reads number: {total_aligned_reads_list}")

        # 创建DataFrame
        data = {
            'Sample': samples_list,
            'Type': ['control'] * int(control_count) + ['treatment'] * int(treatment_count),
            'Input File1': input1_files,
            'Input File2': input2_files,
            '5\' adapter': adapter_5_prime,
            '3\' adapter': adapter_3_prime,
            'Total Reads': total_reads_list,
            'Trimmed Reads': trimmed_reads_list,
            'Aligned Reads': total_aligned_reads_list
        }

        df = pd.DataFrame(data)

        # 只显示Total Reads, Trimmed Reads, Aligned Reads数据的柱状图
        df_melted = df.melt(id_vars=['Sample'], value_vars=['Total Reads', 'Trimmed Reads', 'Aligned Reads'],
                            var_name='Read Type', value_name='Read Counts')
        fig = px.bar(df_melted, x='Sample', y='Read Counts', color='Read Type', barmode='group',
                     title='Read Counts Barchart', text='Read Counts')
        fig.update_layout(
            font=dict(
                family="Arial, sans-serif",
                size=16
            ),
            xaxis_title=None,
            yaxis_title=None,
            showlegend=True
        )
        readCount_html_barChart = fig.to_html(full_html=False)

        # 生成HTML内容模板
        template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>RNA-seq Report</title>
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    font-size: 16px;
                }
                h1 {
                    color: #333;
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                }
                h2 {
                    color: #333;
                    font-size: 18px;
                }
                table {
                    width: 100%;
                    text-align: left;
                    table-layout: auto;
                }
                table th, table td {
                    text-align: left;
                }
                table th {
                    background-color: white;
                    color: #333;
                    border-bottom: 2px solid #dee2e6;
                }
                .row {
                    margin-bottom: 20px;
                }
                .chart-container img {
                    max-width: 100%;
                    height: auto;
                }
                .table-striped tbody tr:nth-of-type(odd) {
                    background-color: rgba(0, 0, 0, 0.05);
                }
            </style>
        </head>
        <body>
            <h1>RNA-seq Analysis Report for Job ID: {{ jobID }}</h1>
            <div class="row" style="display: flex; align-items: center;">
                <div class="col-md-6">
                    <div class="row" style="display: flex; margin-bottom: 10px;">
                        <div class="col-md-4" style="font-weight: bold;">Your email</div>
                        <div class="col-md-8">{{ email }}</div>
                    </div>
                    <div class="row" style="display: flex; margin-bottom: 10px;">
                        <div class="col-md-4" style="font-weight: bold;">Your species</div>
                        <div class="col-md-8">{{ species }}</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div>{{ readCount_html_barChart_content | safe }}</div>
                </div>
            </div>

            <h2>Data Processing Summary</h2>
            <table class="table table-striped">
                {{ table_content }}
            </table>

        </body>
        </html>
        """)

        # 渲染HTML
        html_content = template.render(
            jobID=JobIDinput,
            email=email,
            species=species,
            control_count=control_count,
            treatment_count=treatment_count,
            input1_files=input1_files,
            input2_files=input2_files,
            adapter_5_prime=adapter_5_prime,
            adapter_3_prime=adapter_3_prime,
            samples_list=samples_list,
            table_content=df.to_html(classes='table table-striped', index=False, escape=False),
            readCount_html_barChart_content=readCount_html_barChart
        )

        # 保存HTML内容到文件
        with open('RNAseq_Analysis_Report.html', 'w') as f:
            f.write(html_content)

        print("HTML report generated successfully.")

    def GeneTPM_data_report(self, JobIDinput):
        try:
            jobID = JobIDinput
            os.chdir(f"/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/{jobID}/")

            samples_list = []
            with open("sample_list.txt",'r+') as f1:
                for line1 in f1:
                    samples_list.append(line1.split(" ")[0])


            with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{jobID}.log", 'r') as log_file:# 读取日志文件内容
                log_content = log_file.read()

            # 提取读取数信息，并乘以2
            total_reads_list = [int(x.replace(',', '')) for x in
                                re.findall(r'Total read pairs processed:\s+([\d,]+)', log_content, re.MULTILINE)]
            trimmed_reads_list = [int(x.replace(',', '')) for x in
                                  re.findall(r'Pairs written \(passing filters\):\s+([\d,]+)', log_content, re.MULTILINE)]

            # 提取每个样本的数据块
            sample_blocks = re.findall(r'Running HISAT2 for \w+.*?\n(.*?)\d+\.\d+% overall alignment rate', log_content,
                                       re.DOTALL)

            # 计算总对齐读取数
            def mapping_reads_number(block):
                paired_exactly_once = int(
                    re.search(r'(\d+) \(\d+\.\d+%\) aligned concordantly exactly 1 time', block).group(1))
                paired_more_than_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned concordantly >1 times', block).group(1))
                discordantly_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned discordantly 1 time', block).group(1))
                unpaired_exactly_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned exactly 1 time', block).group(1))
                unpaired_more_than_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned >1 times', block).group(1))
                paired_aligned_reads = (paired_exactly_once + paired_more_than_once + discordantly_once) * 2
                unpaired_aligned_reads = unpaired_exactly_once + unpaired_more_than_once
                total_aligned_reads = int((paired_aligned_reads + unpaired_aligned_reads)/2) #我计算的平均每个fastq的mapping reads
                return total_aligned_reads

            total_aligned_reads_list = [mapping_reads_number(block) for block in sample_blocks]

            species = re.search(r"RNAseq Species: ([\w\.]+)", log_content).group(1)
            email = re.search(r"RNAseq email: ([\w@.]+)", log_content).group(1)
            adapter_5_prime = re.findall(r'RNAseq_FIVE_PRIME_ADAPTER_\d+=(\w+)', log_content,
                                         re.MULTILINE)
            adapter_3_prime = re.findall(r'RNAseq_THREE_PRIME_ADAPTER_\d+=(\w+)', log_content,
                                         re.MULTILINE)
            input1_files = re.findall(r'RNAseq_INPUT_FILE1_\d+=.*/([\w-]+\.fastq\.gz)', log_content, re.MULTILINE)
            input2_files = re.findall(r'RNAseq_INPUT_FILE2_\d+=.*/([\w-]+\.fastq\.gz)', log_content, re.MULTILINE)

            print(f"Your email: {email}")
            print(f"Your species: {species}")
            print(f"Each of your input fastq1 name: {input1_files}")
            print(f"Each of your input fastq2 name: {input2_files}")
            print(f"Each of your input 5' adapter: {adapter_5_prime}")
            print(f"Each of your input 3' adapter: {adapter_3_prime}")
            print(f"Each of your output file name: {samples_list}")
            print(f"Each of your raw reads number: {total_reads_list}")
            print(f"Each of your trimmed reads number: {trimmed_reads_list}")
            print(f"Each of your aligned reads number: {total_aligned_reads_list}")

            # 创建DataFrame
            data = {
                'Sample': samples_list,
                'Input File1': input1_files,
                'Input File2': input2_files,
                '5\' adapter': adapter_5_prime,
                '3\' adapter': adapter_3_prime,
                'Total Reads': total_reads_list,
                'Trimmed Reads': trimmed_reads_list,
                'Aligned Reads': total_aligned_reads_list
            }

            df = pd.DataFrame(data)

            # 只显示Total Reads, Trimmed Reads, Aligned Reads数据的柱状图
            df_melted = df.melt(id_vars=['Sample'], value_vars=['Total Reads', 'Trimmed Reads', 'Aligned Reads'],
                                var_name='Read Type', value_name='Read Counts')
            fig = px.bar(df_melted, x='Sample', y='Read Counts', color='Read Type', barmode='group',
                         title='Read Counts Barchart', text='Read Counts')
            fig.update_layout(
                font=dict(
                    family="Arial, sans-serif",
                    size=16
                ),
                xaxis_title=None,
                yaxis_title=None,
                showlegend=True
            )
            readCount_html_barChart = fig.to_html(full_html=False)

            # 生成HTML内容模板
            template = Template("""
            <!DOCTYPE html>
            <html>
            <head>
                <title>RNA-seq Report</title>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        font-size: 16px;
                    }
                    h1 {
                        color: #333;
                        text-align: center;
                        font-size: 24px;
                        font-weight: bold;
                    }
                    h2 {
                        color: #333;
                        font-size: 18px;
                    }
                    table {
                        width: 100%;
                        text-align: left;
                        table-layout: auto;
                    }
                    table th, table td {
                        text-align: left;
                    }
                    table th {
                        background-color: white;
                        color: #333;
                        border-bottom: 2px solid #dee2e6;
                    }
                    .row {
                        margin-bottom: 20px;
                    }
                    .chart-container img {
                        max-width: 100%;
                        height: auto;
                    }
                    .table-striped tbody tr:nth-of-type(odd) {
                        background-color: rgba(0, 0, 0, 0.05);
                    }
                </style>
            </head>
            <body>
                <h1>RNA-seq Analysis Report for Job ID: {{ jobID }}</h1>
                <div class="row" style="display: flex; align-items: center;">
                    <div class="col-md-6">
                        <div class="row" style="display: flex; margin-bottom: 10px;">
                            <div class="col-md-4" style="font-weight: bold;">Your email</div>
                            <div class="col-md-8">{{ email }}</div>
                        </div>
                        <div class="row" style="display: flex; margin-bottom: 10px;">
                            <div class="col-md-4" style="font-weight: bold;">Your species</div>
                            <div class="col-md-8">{{ species }}</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div>{{ readCount_html_barChart_content | safe }}</div>
                    </div>
                </div>
    
                <h2>Data Processing Summary</h2>
                <table class="table table-striped">
                    {{ table_content }}
                </table>
    
            </body>
            </html>
            """)

            # 渲染HTML
            html_content = template.render(
                jobID=JobIDinput,
                email=email,
                species=species,
                input1_files=input1_files,
                input2_files=input2_files,
                adapter_5_prime=adapter_5_prime,
                adapter_3_prime=adapter_3_prime,
                samples_list=samples_list,
                table_content=df.to_html(classes='table table-striped', index=False, escape=False),
                readCount_html_barChart_content=readCount_html_barChart
            )

            # 保存HTML内容到文件
            with open('RNAseq_Analysis_Report.html', 'w') as f:
                f.write(html_content)

            print("HTML report generated successfully.")
        except Exception as e:
            print(f"An error occurred: {e}")

    def fastq_length_distribution(self, input1):
        with open(input1, 'r+') as f1:
            list1 = []
            dict_read_length = {}
            for line1 in f1:
                if line1[0] == '@':
                    if len(list1) == 4:
                        read_length = len(list1[1])
                        # print(read_length)
                        dict_read_length[read_length] = dict_read_length.get(read_length, 0)
                        dict_read_length[read_length] += 1
                    list1 = []
                    list1.append(line1.strip())
                else:
                    list1.append(line1.strip())
        f2 = pd.DataFrame.from_dict(dict_read_length, orient='index')
        f2.rename(columns={0: input1}, inplace=True)
        f2.reset_index(inplace=True)
        f2.sort_values(by=['index'], ascending=True, inplace=True)
        f2.to_csv(input1.replace('fastq', 'csv').replace('fq', 'csv'), index=False)
        sns.set(style="darkgrid", rc={'figure.figsize': (20, 10)})
        sns.set(font_scale=2)
        sns.lineplot(x='index', y=f'{input1}', data=f2)
        plt.savefig(f"{input1}.pdf")

    def fasta_length_distribution(self, input1):
        with open(input1, 'r+') as f1:
            dict_read_length = {}
            for line1 in f1:
                if line1[0] != '>':
                    read_length = len(line1.strip())
                    dict_read_length[read_length] = dict_read_length.get(read_length, 0)
                    dict_read_length[read_length] += 1
        f2 = pd.DataFrame.from_dict(dict_read_length, orient='index')
        f2.reset_index(inplace=True)
        f2.rename(columns={0: input1, 'index': 'length'}, inplace=True)
        f2.sort_values(by=['length'], ascending=True, inplace=True)
        f2.to_csv(input1.replace('fasta', 'csv'), index=False)
        print(f2)
        sns.set(style="darkgrid", rc={'figure.figsize': (20, 10)})
        sns.set(font_scale=2)
        sns.lineplot(x='length', y=f'{input1}', data=f2)
        plt.savefig(f"{input1}.pdf")

    def all_miRNA_abundance_1st_18th(self, input_file, microRNA_database):
        miRNA_seq_name_dict = Database().microRNA_sequence_to_name_database_1st_18nt(input=microRNA_database)

        # Output file names
        output_Isoform_file = input_file.replace(".CutUMI.fasta", "").replace(".fasta", "") + f'.Isoform_mirnaCount.csv'
        output_total_file = input_file.replace(".CutUMI.fasta", "").replace(".fasta", "") + f'.miRNA_totalCount.csv'

        miRNA_abundance_dict1 = dict()
        with open(input_file) as f1:
            for line1 in f1:
                if (line1[:18] in miRNA_seq_name_dict) and (len(line1.strip()) <= 30):  # miRNA length less than 30bp
                    each_miRNA_isoform_sequence = line1.strip()
                    each_miRNA_name1_rawseq = miRNA_seq_name_dict[line1[:18]]
                    miRNA_names = re.findall(r'(?:hsa|mmu|cel|dme|AQ-Spike)[^&]+', each_miRNA_name1_rawseq)
                    each_miRNA_name1 = '&'.join(miRNA_names)  # Join miRNA names with '&'
                    mirnaName_isoformSequence = each_miRNA_name1 + "_" + each_miRNA_isoform_sequence
                    miRNA_abundance_dict1[mirnaName_isoformSequence] = miRNA_abundance_dict1.get(
                        mirnaName_isoformSequence, 0) + 1

        df = pd.DataFrame.from_dict(miRNA_abundance_dict1, orient='index', columns=['rawCount']).reset_index()
        output_file_basename = os.path.basename(output_Isoform_file)

        # Split 'index' into 'miRNA_name' and 'Sequence' columns
        df[['miRNA_name', 'Sequence']] = df['index'].str.split('_', n=1, expand=True)
        sample_column_name = output_file_basename.replace(".Isoform_mirnaCount.csv", "")

        # Reorder and rename columns
        df = df[['miRNA_name', 'Sequence', 'rawCount']]
        df.columns = ['miRNA_name', 'Sequence', f'{sample_column_name}']

        # Write the isoform counts to the Isoform_mirnaCount.csv file
        df.to_csv(f'{output_Isoform_file}', index=False)

        # Aggregate counts per miRNA_name to get total counts
        df_total = df.groupby('miRNA_name')[sample_column_name].sum().reset_index()

        # Write the total counts to the miRNA_totalCount.csv file
        df_total.to_csv(f'{output_total_file}', index=False)

class Target_analysis:
    def __init__(self):
        pass

    def Cumulative_fraction_curve(self,DeseqInput="", BaseMeanFilterNumber="100",
                                                miRNAinput="",outputFile="",species=""):
        # 将 miRNAinput 分割成单个 miRNA 的列表
        miRNA_list = miRNAinput.split(';') # 目前miRNA input 可能是一个，也可能是多个如dme-miR-279-3p;dme-miR-286-3p;dme-miR-996-3p， 对于CLASH table 需要分开才能识别 其CLASH中target
        try:
            # open target file
            print(species)
            if species == "Human":
                f_targetScan = pd.read_csv("/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/Human_targetScan_targets_20241115.csv", index_col=0)
                f_CLASH = pd.read_csv("/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/Human_CLASH_each_miRNA_targets_20241006.csv", index_col=0)
            elif species == "Mouse":
                f_targetScan = pd.read_csv("/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/mouse_targetScan_targets_20241115.csv", index_col=0)
                f_CLASH = pd.read_csv("/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/Mouse_CLASH_each_miRNA_targets_20241006.csv", index_col=0)
            elif species == "D.melanogaster":
                f_targetScan = pd.read_csv("/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/fly_targetScan_targets_20241115.csv",index_col=0)
                f_CLASH = pd.read_csv("/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/DrosophilaS2_CLASH_each_miRNA_targets_20241006.csv",index_col=0)
            elif species == "C.elegans":
                f_targetScan = pd.read_csv("/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/Celegan_targetScan_targets_20241115.csv",index_col=0)
                f_CLASH = pd.read_csv("/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/celegans_CLASH_miRNA_target_summary20250802.csv",index_col=0)


            CLASH_Conserved_targetsList = set(target for miRNA in miRNA_list if miRNA in f_CLASH.index for target in f_CLASH.loc[miRNA]['CLASH_conserved_targets'].split(';'))
            CLASH_all_targetsList = set(target for miRNA in miRNA_list if miRNA in f_CLASH.index for target in f_CLASH.loc[miRNA]['CLASH_total_targets'].split(';'))
            print(len(CLASH_Conserved_targetsList),len(CLASH_all_targetsList))


            targetScan_Conserved_targetsList = set((f_targetScan.loc[miRNAinput]['conserved_targets']).split(';'))
            targetScan_all_targetsList = set((f_targetScan.loc[miRNAinput]['total_targets']).split(';'))
            print(len(targetScan_Conserved_targetsList), len(targetScan_all_targetsList))

            f_DeSeq2Result = pd.read_csv(DeseqInput)
            f_DeSeq2Result_sorted = f_DeSeq2Result.sort_values(by="baseMean", ascending=False)
            f_DeSeq2Result_deduplicated = f_DeSeq2Result_sorted.drop_duplicates(subset="GeneName", keep="first")    # 去除 GeneName 列中重复项，保留 baseMean 最大的
            f_DeSeq2Result_indexed = f_DeSeq2Result_deduplicated.set_index("GeneName")  # 将 GeneName 设置为索引

            f_DeSeq2Result_indexed.index = f_DeSeq2Result_indexed.index.str.split(':').str[-1] # 有些基因，尤其在drosophila里面，他的名字是18SrRNA-Psi:CR41602， 这个code的目的是去掉前面的，只保留CR41602
            f_DeSeq2Result_filtered = f_DeSeq2Result_indexed[f_DeSeq2Result_indexed['baseMean'] >= float(BaseMeanFilterNumber)].copy()

            #  按 baseMean 降序排序
            f_DeSeq2Result_filtered = f_DeSeq2Result_filtered.sort_values(by='baseMean', ascending=False)
            f_DeSeq2Result_filtered = f_DeSeq2Result_filtered[~f_DeSeq2Result_filtered.index.duplicated(keep='first')] # 有少量的 DEseq CSV文件中，有一些 gene name是一样的，所去掉表达量低的重复名字的基因

            # conserved targets from CLASH
            f_conserved_CLASH = f_DeSeq2Result_filtered.reindex(CLASH_Conserved_targetsList).dropna(how="all")  # extract conserved match CLASH targets
            f_conserved_CLASH = f_conserved_CLASH.sort_values(by='log2FoldChange')

            try:
                f_conserved_CLASH['order'] = np.arange(0, 1, 1 / len(f_conserved_CLASH)) # add order column，from low to high fold change level
            except:
                f_conserved_CLASH['order'] = np.arange(0, 1, 1 / len(f_conserved_CLASH))[:-1]

            # all targets from CLASH
            f_all_CLASH = f_DeSeq2Result_filtered.reindex(CLASH_all_targetsList).dropna(how="all")  # extract all CLASH targets
            f_all_CLASH = f_all_CLASH.sort_values(by='log2FoldChange')
            try:
                f_all_CLASH['order'] = np.arange(0, 1, 1 / len(f_all_CLASH))
            except:
                f_all_CLASH['order'] = np.arange(0, 1, 1 / len(f_all_CLASH))[:-1]

            print(len(f_conserved_CLASH), len(f_all_CLASH))

            # conserved targets from targetScan
            f_conserved_targetScan = f_DeSeq2Result_filtered.reindex(targetScan_Conserved_targetsList).dropna(how="all")  # extract targets from TargetScan
            f_conserved_targetScan = f_conserved_targetScan.sort_values(by='log2FoldChange')
            try:
                f_conserved_targetScan['order'] = np.arange(0, 1, 1 / len(f_conserved_targetScan))
            except:
                f_conserved_targetScan['order'] = np.arange(0, 1, 1 / len(f_conserved_targetScan))[:-1]

            # all targets from targetScan
            f_all_targetScan = f_DeSeq2Result_filtered.reindex(targetScan_all_targetsList).dropna(how="all")  # extract targets from TargetScan
            f_all_targetScan = f_all_targetScan.sort_values(by='log2FoldChange')
            try:
                f_all_targetScan['order'] = np.arange(0, 1, 1 / len(f_all_targetScan))
            except:
                f_all_targetScan['order'] = np.arange(0, 1, 1 / len(f_all_targetScan))[:-1]

            print(len(f_conserved_targetScan), len(f_all_targetScan))

            # non - targets,removed all targets from both targetScan and CLASH
            all_target_both_CLASH_and_targetScan = CLASH_all_targetsList.union(targetScan_all_targetsList)
            f_non_targets = f_DeSeq2Result_filtered.loc[~f_DeSeq2Result_filtered.index.isin(all_target_both_CLASH_and_targetScan)]  # extract non-targets， with targets exist in TargetScan and CLASH
            f_non_targets = f_non_targets.sort_values(by='log2FoldChange')
            try:
                f_non_targets['order'] = np.arange(0, 1, 1 / len(f_non_targets))
            except:
                f_non_targets['order'] = np.arange(0, 1, 1 / len(f_non_targets))[:-1]

            # 添加 TargetType 列
            f_conserved_CLASH['TargetType'] = 'Conserved targets from CLASH'
            f_all_CLASH['TargetType'] = 'All targets from CLASH'
            f_conserved_targetScan['TargetType'] = 'Conserved targets from TargetScan'
            f_all_targetScan['TargetType'] = 'All targets from TargetScan'
            f_non_targets['TargetType'] = 'Non-targets'

            # 将 5 个数据框上下合并
            merged_dataframe = pd.concat([
                f_conserved_CLASH,
                f_all_CLASH,
                f_conserved_targetScan,
                f_all_targetScan,
                f_non_targets
            ], axis=0)

            merged_dataframe.reset_index(drop=False, inplace=True)
            merged_dataframe.to_csv(f"{outputFile}_merged_targets_data.csv", index=False)


            P_value_conserved_CLASH_vs_NonTarget = mannwhitneyu(f_conserved_CLASH['log2FoldChange'], f_non_targets['log2FoldChange'])[1]
            P_value_all_CLASH_vs_NonTarget = mannwhitneyu(f_all_CLASH['log2FoldChange'], f_non_targets['log2FoldChange'])[1]
            P_value_conserved_targetScan_vs_NonTarget = mannwhitneyu(f_conserved_targetScan['log2FoldChange'], f_non_targets['log2FoldChange'])[1]
            P_value_all_targetScan_vs_NonTarget = mannwhitneyu(f_all_targetScan['log2FoldChange'], f_non_targets['log2FoldChange'])[1]

            fig, ax = plt.subplots()
            fig.set_size_inches(12, 12)
            sns.lineplot(data=f_conserved_CLASH, x='log2FoldChange', y='order', color='red', linewidth=3,linestyle='solid',label=f"conserved targets from CLASH ({len(f_conserved_CLASH)}) P-value (Mann-Whitney U): {P_value_conserved_CLASH_vs_NonTarget}")
            sns.lineplot(data=f_all_CLASH, x='log2FoldChange', y='order', color='orange', linewidth=3,linestyle='solid',label=f"all targets from CLASH({len(f_all_CLASH)}) P-value (Mann-Whitney U): {P_value_all_CLASH_vs_NonTarget}")
            sns.lineplot(data=f_conserved_targetScan, x='log2FoldChange', y='order', color='green', linewidth=3,linestyle='solid',label=f"conserved targets from TargetScan ({len(f_conserved_targetScan)}) P-value (Mann-Whitney U): {P_value_conserved_targetScan_vs_NonTarget}")
            sns.lineplot(data=f_all_targetScan, x='log2FoldChange', y='order', color='blue', linewidth=3,linestyle='solid',label=f"all targets from TargetScan ({len(f_all_targetScan)}) P-value (Mann-Whitney U): {P_value_all_targetScan_vs_NonTarget}")
            sns.lineplot(data=f_non_targets, x='log2FoldChange', y='order', color='black', linewidth=3,linestyle='solid', label=f'Non targets ({len(f_non_targets)})')
            ax.set_xlim(-1.5, 1.5)
            ax.set_ylim(0, 1.1)
            ax.set_xlabel('Fold change (log2)', fontsize=15)
            ax.set_ylabel('Cumulative fraction', fontsize=15)
            ax.text(0.02, 1.07, f"miRNA name: {miRNAinput}\nBaseMean: {BaseMeanFilterNumber}",
                    fontsize=15, verticalalignment='top', horizontalalignment='left',
                    transform=ax.transAxes)

            # Create the legend and remove the frame
            legend = ax.legend(loc='upper center',
                               bbox_to_anchor=(0.5, -0.15),  # Position the legend below the plot
                               ncol=1,  # Number of columns in the legend
                               fontsize=15,  # Font size for legend labels
                               frameon=False)  # Remove the gray frame around the legend

            ax.tick_params(axis='both', which='major', labelsize=15)

            # Adjust layout to make room for the legend and the added text
            plt.tight_layout()
            # Save the figure
            plt.savefig(f"{outputFile}_CumulativeFractionCurve.svg", format='svg')

        except Exception as e:
            print("An error occurred in the Cumulative_fraction_curve method:")
            traceback.print_exc()
            raise  # Re-raise the exception to be handled by the caller



if __name__ == "__main__":
    # print('This script is edited by Lu Li from Mingyi Xie Lab, University of Florida')
    def command_line():
        argv_step_command = sys.argv[1]
        argv = sys.argv[2:]
        try:
            if argv_step_command == 'making_unique_redundant_database_hg38':
                opts, args = getopt.getopt(argv, 'i:', ['input='])  # getopt.getopt(args, shortopts, longopts=[])
                input_martquery_database = opts[0][1]
                print(input_martquery_database)
                Database().making_unique_redundant_database_hg38(input=input_martquery_database)  # step 1
            elif argv_step_command == 'making_unique_redundant_database_mm39':
                opts, args = getopt.getopt(argv, 'i:', ['input='])  # getopt.getopt(args, shortopts, longopts=[])
                input_martquery_database = opts[0][1]
                print(input_martquery_database)
                Database().making_unique_redundant_database_mm39(input=input_martquery_database)  # step

            elif argv_step_command == 'making_unique_redundant_database_WBcel235':
                opts, args = getopt.getopt(argv, 'i:', ['input='])  # getopt.getopt(args, shortopts, longopts=[])
                input_martquery_database = opts[0][1]
                print(input_martquery_database)
                Database().making_unique_redundant_database_WBcel235(input=input_martquery_database)  # step 1

            elif argv_step_command == 'FASTQ_length_distribution':
                opts, args = getopt.getopt(argv, 'i:', ['input=', ])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-i':
                        input_file1 = opt[1]
                        print(input_file1)
                print(opts)
                Statistic().fastq_length_distribution(input1=input_file1)
            elif argv_step_command == 'FASTA_length_distribution':
                opts, args = getopt.getopt(argv, 'i:', ['input=', ])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-i':
                        input_file1 = opt[1]
                        print(input_file1)
                print(opts)
                Statistic().fasta_length_distribution(input1=input_file1)

            elif argv_step_command == 'all_miRNA_abundance_1st_18th':
                opts, args = getopt.getopt(argv, 'i:d:l:', ['input=', 'miRNA_database=',
                                                            'longest_isoform_length'])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-i':
                        input_file1 = opt[1]
                    elif opt[0] == '-d':
                        database1 = opt[1]
                print(opts)
                print(
                    f"miRNA abundance criteria:\n1. The top 18 nts of miRNA in the beginning of reads\n2. The reads length are between 18 nts to 30bp\n")
                Statistic().all_miRNA_abundance_1st_18th(input_file=input_file1, microRNA_database=database1)

            elif argv_step_command == 'making_simple_BedGraph':
                opts, args = getopt.getopt(argv, 'i:c:',
                                           ['input=', 'chromosome='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-i':
                        input_bedGraph = opt[1]
                    elif opt[0] == '-c':
                        chr_name = opt[1]
                print(input_bedGraph)
                print(opts)
                BedGraph().making_simple_version(file=input_bedGraph, chromosome_name=chr_name)  # step 3
            elif argv_step_command == 'making_transcript_sequence_genomeposition_conservation_database':
                opts, args = getopt.getopt(argv, 'g:t:c:', ['genome_database=', 'transcript_database=',
                                                            'chromosome='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-g':
                        genome_database = opt[1]
                    elif opt[0] == '-t':
                        transcript_database = opt[1]
                    elif opt[0] == '-c':
                        chromosome = opt[1]
                print(opts)
                Database().making_transcript_sequence_genomeposition_conservation_database(
                    genome_file=genome_database, transcript_file=transcript_database, chr_name=chromosome)  # step 4
            elif argv_step_command == 'Viennad_to_Table':
                opts, args = getopt.getopt(argv, 't:c:i:n:p:',
                                           ['transcirpt_database=', 'transcript_ConservationScore_database=',
                                            'viennad=', 'name_database=','premiRNA_database'])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-c':
                        transcript_CS = opt[1]
                    elif opt[0] == '-t':
                        transcript_DB = opt[1]
                    elif opt[0] == '-i':
                        input1 = opt[1]
                    elif opt[0] == '-n':
                        Name_database1 = opt[1]
                    elif opt[0] == '-p':
                        premiRNA_database1 = opt[1]
                print(f"Current Working Directory: {os.getcwd()}")
                print(opts)
                try:
                    print("step I: convert Viennad to table and calculate conservation score, ~5 minutes")

                    Viennad_to_table(transcript_ConservationScore_database=transcript_CS,
                                     transcript_only_database=transcript_DB).input_viennad(file=input1)
                    print("\nstep II: Compressed table, ~2 minutes, remove dG> -11.1")
                    Compressed_table().files(input=input1)
                    print("\nstep III: Analyze potential miRNAs that have been incorrectly identified as targets.")
                    Compressed_table().potential_miRNA_identification(input=input1,premiRNA_database=premiRNA_database1) # 如果element 序列比对到premiRNA，那么被认为其为潜在的miRNA而不是 真 target
                    print("\nStep IV: Calculate miRNA binding site position, ~2 minutes")
                    Gene_region(ensemble_database=Name_database1).table(input=input1)
                    print("\nStep V: Change BasePattern to FinalResult, 延长genome position，与target element 位置匹配，不是仅仅包含pairing的position, ~2 minutes")
                    Viennad_to_table().file_Basepattern_FinalResult(inputFile=f"{input1}_region.txt")
                except Exception as e:
                    traceback.print_exc()
                    sys.exit()

                # print("\nStep IV: TDMD analyzer, ~1 minutes")
                # Combined_table().TDMD_candidate(input_file=input1 + '_compressed_region.txt')

            elif argv_step_command == 'TDMD_analyzer':
                opts, args = getopt.getopt(argv, 'i:',
                                           ['input_table='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-i':
                        input1 = opt[1]
                print(opts)
                Combined_table().TDMD_candidate(input_file=input1)
            elif argv_step_command == 'Cumulative_fraction_curve_targetScan_CLASH':
                try:
                    opts, args = getopt.getopt(argv, 'd:b:m:o:s:',
                                               ['DeseqFile=', 'baseMean=', 'miRNA_Name','outputFile','species'])
                    for opt in opts:
                        if opt[0] == '-d':
                            deseq_CSV1 = opt[1]
                        elif opt[0] == '-b':
                            baseMean1 = opt[1]
                        elif opt[0] == '-m':
                            miRNAname1 = opt[1]
                        elif opt[0] == '-o':
                            outputFile1 = opt[1]
                        elif opt[0] == '-s':
                            species1 = opt[1]
                    print(opts)
                    Target_analysis().Cumulative_fraction_curve(DeseqInput=deseq_CSV1, BaseMeanFilterNumber=baseMean1,
                                                                miRNAinput=miRNAname1, outputFile=outputFile1, species=species1)
                except Exception as e:
                    print("An error occurred while running the script:")
                    traceback.print_exc()
                    sys.exit(1)

            elif argv_step_command == 'data_report':
                opts, args = getopt.getopt(argv, 'j:o:',
                                           ['jobID=','Output_filename='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                    elif opt[0] == '-o':
                        Output1 = opt[1]
                print(opts)
                Statistic().data_report(JobID1=input1, Output_filename1=Output1)
            elif argv_step_command == 'rnaseqTPM_merge':
                opts, args = getopt.getopt(argv, 'j:s:',
                                           ['jobID=','Species='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                    elif opt[0] == '-s':
                        species_input = opt[1]
                print(opts)
                try:
                    Combined_table().rnaseqTPM_merge(JobID1=input1,species1=species_input)
                except Exception as e:
                    logging.error("Error occurred in command_line function", exc_info=True)
                    sys.exit()
            elif argv_step_command == 'rnaseqDEseqtable_merge':
                opts, args = getopt.getopt(argv, 'j:s:',
                                           ['jobID=','Species='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                    elif opt[0] == '-s':
                        species_input = opt[1]
                print(opts)
                try:
                    Combined_table().rnaseqDEseqtable_merge(JobID1=input1,species1=species_input)
                except Exception as e:
                    logging.error("Error occurred in command_line function", exc_info=True)
                    sys.exit()
            elif argv_step_command == 'reorder_geneCountFileColumn':
                try:
                    Statistic().reorder_geneCountFileColumn()
                except Exception as e:
                    logging.error("Error occurred in reorder_geneCountFileColumn", exc_info=True)
                    sys.exit()
            elif argv_step_command == 'Deseq2_data_report':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                Statistic().Deseq2_data_report(JobIDinput=input1)

            elif argv_step_command == 'GeneTPM_data_report':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                try:
                    Statistic().GeneTPM_data_report(JobIDinput=input1)
                except Exception as e:
                    logging.error("Error occurred in GeneTPM_data_report", exc_info=True)
                    sys.exit()


            elif argv_step_command == 'aqPE_data_report':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                try:
                    Statistic().aqPE_data_report(JobID1=input1)
                except Exception as e:
                    logging.error("Error occurred in aqPE_data_report", exc_info=True)
                    sys.exit()
            elif argv_step_command == 'aqSE_data_report':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                try:
                    Statistic().aqSE_data_report(JobID1=input1)
                except Exception as e:
                    logging.error("Error occurred in aqSE_data_report", exc_info=True)
                    sys.exit()

            elif argv_step_command == 'aqCR_data_report':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                try:
                    Statistic().aqCR_data_report(JobID1=input1)
                except Exception as e:
                    logging.error("Error occurred in aqCR_data_report", exc_info=True)
                    sys.exit()

            elif argv_step_command == 'Concat_mirnaCount':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                try:
                    Combined_table().Concat_mirnaCount(JobIDinput=input1)
                except Exception as e:
                    logging.error("Error occurred in Concat mirnaCount", exc_info=True)
                    sys.exit()

            else:
                print('USAGE')
                print('-h [--help]')
                print('python3 CLASHub.py FASTQ_length_distribution -i [--input] <FASTQ>')
                print('python3 CLASHub.py FASTA_length_distribution -i [--input] <FASTA>')
                print('python3 CLASHub.py all_miRNA_abundance_1st_18th -i [--input] <fasta/fastq> -d [--miRNA_database]')
                print('python3 CLASHub.py making_unique_redundant_database_hg38 -i [--input] <TXT>')
                print('python3 CLASHub.py making_unique_redundant_database_mm39 -i [--input] <TXT>')
                print('python3 CLASHub.py making_unique_redundant_database_WBcel235 -i [--input] <TXT>')
                print('python3 CLASHub.py making_simple_BedGraph -i [--input] <TXT> -c chromosome_name')
                print('python3 CLASHub.py making_transcript_sequence_genomeposition_conservation_database -g [--genome_database] -t [--transcript_database] -c [--chromosome]')
                print('python3 CLASHub.py Viennad_to_Table -i [--viennad] <TXT> -c [--transcript_ConservationScore_database] -t [--transcript_database] -n [--name_database]')
                print('python3 CLASHub.py TDMD_analyzer -i [--input]')
                print('python3 CLASHub.py Cumulative_fraction_curve_targetScan_CLASH -d [--DeseqFile] -b [--baseMean] -m [--miRNA_Name] -o [--outputFile] -s [--species]') # only choose mRNA
                print('python3 CLASHub.py AQ-seq -1 [fastq_1] -2 [fastq_2] -o [fastq_out] -d [miR_database]')
                print('python3 CLASHub.py data_report -j [--jobID] -o [--Output_filename]')
                print('python3 CLASHub.py rnaseqTPM_merge -j [--jobID] -s [--Species]')
                print('python3 CLASHub.py rnaseqDEseqtable_merge -j [--jobID] -s [--Species]')
                print('python3 CLASHub.py reorder_geneCountFileColumn')
                print('python3 CLASHub.py Concat_mirnaCount -j [--jobID]')
                print('python3 CLASHub.py aqPE_data_report -j [--jobID]')
                print('python3 CLASHub.py aqSE_data_report -j [--jobID]')
                print('python3 CLASHub.py aqCR_data_report -j [--jobID]')
                print('python3 CLASHub.py GeneTPM_data_report -j [--jobID]')
                print('python3 CLASHub.py Deseq2_data_report -j [--jobID]')



        except:
            sys.exit()
    command_line()
